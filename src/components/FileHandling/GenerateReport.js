import { readWellXyInRange } from "../../utilities/filterPack";
import {
  Smoothing_Filter,
  StaticRatio_Filter,
  ControlSubtraction_Filter,
  Derivative_Filter,
  OutlierRemoval_Filter,
} from "../Graphing/FilteredData/FilterModels";

// ---- typed-array-aware accessors for the per-time-point CSV dump --------
// Walk the same priority chain readWellXyInRange uses, but indexed (the dump
// emits row i for all wells, not a time-range slice). Empty string for
// missing values so a sparse well doesn't break the row.
function readFilteredYAt(ind, i) {
  if (ind && ind.filteredYs && ind.filteredYs.length > i) return ind.filteredYs[i];
  if (ind && Array.isArray(ind.filteredData) && ind.filteredData[i]) return ind.filteredData[i].y;
  if (ind && ind.rawYs && ind.rawYs.length > i) return ind.rawYs[i];
  if (ind && Array.isArray(ind.rawData) && ind.rawData[i]) return ind.rawData[i].y;
  return "";
}

function readRawYAt(ind, i) {
  if (ind && ind.rawYs && ind.rawYs.length > i) return ind.rawYs[i];
  if (ind && Array.isArray(ind.rawData) && ind.rawData[i]) return ind.rawData[i].y;
  return "";
}

// ---- metric computations on typed-array slices --------------------------
function minFromYs(ys) {
  if (!ys || ys.length === 0) return 0;
  let m = Infinity;
  for (let i = 0; i < ys.length; i++) if (ys[i] < m) m = ys[i];
  return m === Infinity ? 0 : m;
}

function maxFromYs(ys) {
  if (!ys || ys.length === 0) return 0;
  let m = -Infinity;
  for (let i = 0; i < ys.length; i++) if (ys[i] > m) m = ys[i];
  return m === -Infinity ? 0 : m;
}

function rangeFromYs(ys) {
  if (!ys || ys.length === 0) return 0;
  return maxFromYs(ys) - minFromYs(ys);
}

function slopeFromXsYs(xs, ys) {
  const n = ys ? ys.length : 0;
  if (n === 0) return 0;
  let xsum = 0;
  let ysum = 0;
  for (let i = 0; i < n; i++) {
    xsum += xs[i];
    ysum += ys[i];
  }
  const xmean = xsum / n;
  const ymean = ysum / n;
  let num = 0;
  let denom = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xmean;
    num += dx * (ys[i] - ymean);
    denom += dx * dx;
  }
  return denom === 0 ? 0 : num / denom;
}

export const GenerateCSV = (
  project,
  enabledFilters,
  includeRawData,
  includeFilteredData,
  includeSavedMetrics,
  savedMetrics
) => {
  // Apply filters to each indicator in each well before generating CSV
  project.plate.forEach((plate) => {
    plate.experiments.forEach((experiment) => {
      // Deep copy filteredData for all indicators in all wells
      experiment.wells.forEach((well) => {
        well.indicators.forEach((indicator) => {
          indicator.filteredData = indicator.rawData.map((d) => ({ ...d }));
        });
      });
      // Apply each enabled filter ONCE to the entire wells array
      enabledFilters.forEach((filter) => {
        let filterInstance;
        switch (filter.name) {
          case "Smoothing":
            filterInstance = new Smoothing_Filter(filter.windowWidth);
            break;
          case "Static Ratio":
            filterInstance = new StaticRatio_Filter();
            filterInstance.start = filter.start;
            filterInstance.end = filter.end;
            break;
          case "Control Subtraction":
            filterInstance = new ControlSubtraction_Filter(
              0,
              null,
              experiment.numberOfColumns,
              experiment.numberOfRows
            );
            filterInstance.controlWellArray = filter.controlWellArray;
            filterInstance.applyWellArray = filter.applyWellArray;
            filterInstance.calculate_average_curve(experiment.wells);
            break;
          case "Derivative":
            filterInstance = new Derivative_Filter();
            break;
          case "Outlier Removal":
            filterInstance = new OutlierRemoval_Filter();
            filterInstance.halfWindow = filter.halfWindow;
            filterInstance.threshold = filter.threshold;
            break;
          default:
            filterInstance = null;
        }
        if (filterInstance && typeof filterInstance.execute === "function") {
          filterInstance.execute(experiment.wells);
        }
      });
      // Debug logging for first well/indicator
      if (
        experiment.wells.length > 0 &&
        experiment.wells[0].indicators.length > 0
      ) {
        console.log(
          `First well, first indicator filteredData after filters:`,
          experiment.wells[0].indicators[0].filteredData.slice(0, 10)
        );
      }
    });
  });

  // Header section
  const header = ["<HEADER>"];
  project.plate.forEach((plate) => {
    plate.experiments.forEach((experiment) => {
      header.push(`Date,${project.date}`);
      header.push(`Time,${project.time}`);
      header.push(`Instrument,${project.instrument}`);
      header.push(`ProtocolName,${project.protocol}`);
      header.push(`AssayPlateBarcode,${plate.assayPlateBarcode}`);
      header.push(`AddPlateBarcode,${plate.addPlateBarcode}`);
      experiment.wells[0].indicators.forEach((_, indicatorIndex) => {
        const config = experiment.indicatorConfigurations[indicatorIndex];
        if (config) {
          header.push(`IndicatorName,${config.name}`);
          header.push(`Excitation,${config.Excitation}`);
          header.push(`Emission,${config.Emission}`);
          header.push(`Exposure,${config.Exposure}`);
          header.push(`Gain,${config.Gain}`);
        } else {
          header.push(`Indicator,Unknown`);
        }
      });
      header.push(`Binning,${experiment.binning}`);
      header.push(`NumRows,${experiment.numberOfRows}`);
      header.push(`NumCols,${experiment.numberOfColumns}`);
      header.push(`Operator,${experiment.operator.join(",")}`);
      header.push(`Project,${project.title}`);
    });
  });
  header.push("</HEADER>");

  // Indicator Data section
  const indicatorData = [];
  project.plate.forEach((plate) => {
    plate.experiments.forEach((experiment) => {
      // Iterate through each indicator
      experiment.wells[0].indicators.forEach((_, indicatorIndex) => {
        // Add <INDICATOR_DATA> for each indicator
        indicatorData.push(
          `<INDICATOR_DATA, ${experiment.indicatorConfigurations[indicatorIndex].name}>`
        );
        if (includeRawData) {
          // Add <RAW_DATA> tag before the header row
          indicatorData.push("<RAW_DATA>");

          // Header row: "Time" followed by well labels
          const wellHeaders = [
            "Time",
            ...experiment.wells.map((well) => well.label),
          ];
          indicatorData.push(wellHeaders.join(","));

          // Get time series length from the first well's indicator
          const numTimePoints =
            experiment.wells[0].indicators[indicatorIndex].time.length;

          // Construct rows for each time point for rawData
          for (let i = 0; i < numTimePoints; i++) {
            // Convert time from microseconds to milliseconds (e.g., 352 to 0.352)
            const timeInMilliseconds =
              // experiment.wells[0].indicators[indicatorIndex].time[i] / 1000;
              experiment.wells[0].indicators[indicatorIndex].time[i];

            // Start with converted time for the row
            const row = [timeInMilliseconds];

            // Add the rawData value for each well at the current time index.
            // Walk the typed-array-first priority chain so Phase C wells
            // (with rawXs/rawYs but empty rawData) still emit a value.
            experiment.wells.forEach((well) => {
              row.push(readRawYAt(well.indicators[indicatorIndex], i));
            });

            indicatorData.push(row.join(","));
          }

          // Close the <RAW_DATA> tag
          indicatorData.push("</RAW_DATA>");
        }
        if (includeFilteredData) {
          // Add <FILTERS_USED> tag and filter rows after filtered data
          indicatorData.push("<FILTERS_USED>");
          enabledFilters.forEach((filter) => {
            let filterRow = [filter.id]; // Start with filter ID
            if (filter.name === "Static Ratio") {
              filterRow.push(`start: ${filter.start}, end: ${filter.end}`);
            } else if (filter.name === "Smoothing") {
              filterRow.push(`windowWidth: ${filter.windowWidth}`);
            } else if (filter.name === "Control Subtraction") {
              const controlWellArrayFormatted = filter.controlWellArray
                .map((well) => `row: ${well.row}, col: ${well.col}`)
                .join(", ");
              const applyWellArrayFormatted = filter.applyWellArray
                .map((well) => `row: ${well.row}, col: ${well.col}`)
                .join(", ");
              filterRow.push(
                `controlWellArray:, ${controlWellArrayFormatted}, applyWellArray:, ${applyWellArrayFormatted}`
              );
            } else if (filter.name === "Derivative") {
              filterRow.push("No parameters");
            } else if (filter.name === "Outlier Removal") {
              filterRow.push(
                `halfWindow: ${filter.halfWindow}, threshold: ${filter.threshold}`
              );
            }
            indicatorData.push(filterRow.join(", "));
          });
          indicatorData.push("</FILTERS_USED>");
          // Add <FILTERED_DATA> tag
          indicatorData.push("<FILTERED_DATA>");

          // Add wellHeaders row: "Time" followed by well labels (same as <RAW_DATA>)
          const filteredWellHeaders = [
            "Time",
            ...experiment.wells.map((well) => well.label),
          ];
          indicatorData.push(filteredWellHeaders.join(","));

          // Construct rows for each time point for filteredData
          const numTimePoints =
            experiment.wells[0].indicators[indicatorIndex].time.length;
          for (let i = 0; i < numTimePoints; i++) {
            // Start with converted time for the row (same as before)
            const timeInMilliseconds =
              experiment.wells[0].indicators[indicatorIndex].time[i];
            const row = [timeInMilliseconds];
            experiment.wells.forEach((well) => {
              row.push(readFilteredYAt(well.indicators[indicatorIndex], i));
            });
            indicatorData.push(row.join(","));
          }

          // Close the <FILTERED_DATA> tag
          indicatorData.push("</FILTERED_DATA>");
        }

        // Saved Metrics section
        if (includeSavedMetrics && savedMetrics.length > 0) {
          // Add <METRICS> header to indicate the start of the metrics section
          indicatorData.push("<METRICS>");

          // Full trace x bounds for this indicator — used when a saved
          // metric has no annotation range (range is null/null or older
          // [0, 0] from before the time-domain fix). We compute it once
          // per indicator from the first well's typed arrays / time
          // array so the header label can show real times rather than
          // "from 0 to 0".
          const refInd = experiment.wells[0].indicators[indicatorIndex];
          const fullXs =
            (refInd.filteredXs && refInd.filteredXs.length > 0 && refInd.filteredXs) ||
            (refInd.rawXs && refInd.rawXs.length > 0 && refInd.rawXs) ||
            null;
          const refTime = refInd.time;
          const fallbackStartX = fullXs
            ? fullXs[0]
            : refTime && refTime.length > 0
            ? refTime[0]
            : null;
          const fallbackEndX = fullXs
            ? fullXs[fullXs.length - 1]
            : refTime && refTime.length > 0
            ? refTime[refTime.length - 1]
            : null;

          savedMetrics.forEach((metric) => {
            // Saved metric ranges are TIME values (snapped from the
            // FilteredGraph drag interaction). Normalize at the call site:
            // manual entry or older malformed metrics can be reversed, and
            // readWellXyInRange returns the full signal when start >= end.
            // Treat null/undefined endpoints as "no range" and fall back
            // to the indicator's full trace bounds (so a metric saved
            // with no annotation reports "from 0.15 to 3500" rather than
            // "from 0 to 0" or "from null to null").
            const r0 = metric.range?.[0];
            const r1 = metric.range?.[1];
            const a = r0 != null ? Number(r0) : NaN;
            const b = r1 != null ? Number(r1) : NaN;
            const hasRange = Number.isFinite(a) && Number.isFinite(b);
            const startX = hasRange ? Math.min(a, b) : fallbackStartX;
            const endX = hasRange ? Math.max(a, b) : fallbackEndX;

            const metricHeader = `${metric.metricType} (Time: from ${startX} to ${endX})`;

            // Add header for this metric type, including well labels row
            indicatorData.push(`<${metricHeader}>`);
            const wellLabels = experiment.wells.map((well) => well.label);
            indicatorData.push(wellLabels.join(",")); // Add well labels row

            // Calculate the metric value for each well over the annotation range
            const metricValues = experiment.wells.map((well) => {
              const ind = well.indicators[indicatorIndex];
              const { xs, ys } = readWellXyInRange(ind, startX, endX);
              if (metric.metricType === "Slope") {
                return slopeFromXsYs(xs, ys).toFixed(5);
              } else if (metric.metricType === "Range") {
                return rangeFromYs(ys).toFixed(5);
              } else if (metric.metricType === "Max") {
                return maxFromYs(ys).toFixed(5);
              } else if (metric.metricType === "Min") {
                return minFromYs(ys).toFixed(5);
              }
              return ""; // Handler for unsupported metric types
            });

            // Add a single row of metric values
            indicatorData.push(metricValues.join(","));

            // Close the metric section
            indicatorData.push(`</${metric.metricType}>`);
          });
        }

        // Close the <INDICATOR_DATA> tag
        indicatorData.push("</INDICATOR_DATA>");
      });
    });
  });

  // Combine header and indicator data for the final CSV output
  return [...header, ...indicatorData].join("\r\n");
};

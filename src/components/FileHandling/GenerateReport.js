import {
  linearRegression,
  calculateSlope,
  calculateRange,
  getAllValues,
  getAllSlopes,
  getAllRanges,
} from "../Graphing/Metrics/MetricsUtilities";

import * as d3 from "d3";

export const GenerateCSV = (
  project,
  enabledFilters,
  includeRawData,
  includeFilteredData,
  includeSavedMetrics,
  savedMetrics
) => {
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
        header.push(
          `Indicator,${experiment.indicatorConfigurations[indicatorIndex]}`
        );
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
          `<INDICATOR_DATA, ${experiment.indicatorConfigurations[indicatorIndex]}>`
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
              experiment.wells[0].indicators[indicatorIndex].time[i] / 1000;

            // Start with converted time for the row
            const row = [timeInMilliseconds];

            // Add the rawData value for each well at the current time index
            experiment.wells.forEach((well) => {
              row.push(well.indicators[indicatorIndex].rawData[i].y);
            });

            indicatorData.push(row.join(","));
          }

          // Close the <RAW_DATA> tag
          indicatorData.push("</RAW_DATA>");
        }
        if (includeFilteredData) {
          // Add <FILTERED_DATA> tag
          indicatorData.push("<FILTERED_DATA>");

          // Add <FILTERS_USED> tag
          indicatorData.push("<FILTERS_USED>");

          // Add each enabled filter in a new row with parameters
          enabledFilters.forEach((filter) => {
            let filterRow = [filter.id]; // Start with filter ID

            // Check filter type and add parameters accordingly
            if (filter.name === "Static Ratio") {
              filterRow.push(`start: ${filter.start}, end: ${filter.end}`);
            } else if (filter.name === "Smoothing") {
              filterRow.push(`windowWidth: ${filter.windowWidth}`);
            } else if (filter.name === "Control Subtraction") {
              // Format controlWellArray and applyWellArray
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

            indicatorData.push(filterRow.join(", ")); // Add the filter row
          });

          // Close the <FILTERS_USED> tag
          indicatorData.push("</FILTERS_USED>");
          // Construct rows for each time point for filteredData
          const numTimePoints =
            experiment.wells[0].indicators[indicatorIndex].time.length;
          for (let i = 0; i < numTimePoints; i++) {
            // Start with converted time for the row (same as before)
            const timeInMilliseconds =
              experiment.wells[0].indicators[indicatorIndex].time[i] / 1000;

            // Start with converted time for the row
            const row = [timeInMilliseconds];

            // Add the filteredData value for each well at the current time index
            experiment.wells.forEach((well) => {
              row.push(well.indicators[indicatorIndex].filteredData[i].y);
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

          savedMetrics.forEach((metric) => {
            // Extract the range from the saved metric entry
            const annotationRange = metric.range;

            // Convert annotation range indices to corresponding time values in milliseconds
            const timeArray =
              experiment.wells[0].indicators[indicatorIndex].time;
            const startTime = timeArray[annotationRange[0]] / 1000; // Start time in ms
            const endTime = timeArray[annotationRange[1]] / 1000; // End time in ms

            // Update the metricHeader to use time values
            const metricHeader = `${metric.metricType} (from ${startTime} ms to ${endTime} ms)`;

            // Add header for this metric type, including well labels row
            indicatorData.push(`<${metricHeader}>`);
            const wellLabels = experiment.wells.map((well) => well.label);
            indicatorData.push(wellLabels.join(",")); // Add well labels row

            // Calculate the metric value for each well over the annotation range
            const metricValues = experiment.wells.map((well) => {
              let heatmapData =
                well.indicators[indicatorIndex]?.filteredData || [];
              const maxYValue =
                heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
              const minYValue =
                heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
              // Only include filteredData within the annotationRange if it's set
              if (annotationRange[0] !== null && annotationRange[1] !== null) {
                heatmapData = heatmapData.filter(
                  (_, i) => i >= annotationRange[0] && i <= annotationRange[1]
                );
              }
              if (metric.metricType === "slope") {
                return calculateSlope(heatmapData);
              } else if (metric.metricType === "rangeOfYValues") {
                return calculateRange(heatmapData);
              } else if (metric.metricType === "maxYValue") {
                // return Math.max(heatmapData, (d) => d.y);
                return maxYValue;
              } else if (metric.metricType === "minYValue") {
                // return Math.min(heatmapData, (d) => d.y);
                return minYValue;
              } else {
                return ""; // Handler for unsupported metric types
              }
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

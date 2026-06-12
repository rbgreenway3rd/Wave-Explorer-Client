// Median of a plain numeric array; null on empty. Shared by the StaticRatio
// "rescale by plate-median Fo" path (mirrors filterCore.medianOfArray, kept
// here so the legacy execute() path has no cross-module dependency).
function medianOfArray(arr) {
  const n = arr.length;
  if (n === 0) return null;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = n >> 1;
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export class StaticRatio_Filter {
  static desc = "Static Ratio filter";
  constructor(num, onEdit) {
    this.id = "staticRatio_" + JSON.stringify(num);
    this.name = "Static Ratio";
    // this.desc = "Static Ratio filter";
    this.isEnabled = true;
    this.start = 0;
    this.end = 5;
    // When true, the F/Fo result is rescaled by the plate-wide median Fo
    // (per indicator) so peak height / AUC are comparable well-to-well and
    // the y-magnitude stays sensible for downstream neural analysis.
    this.rescaleByMedianFo = false;
    this.onEdit = onEdit; // Callback to open the modal
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  editParams() {
    console.log("edit params clicked");
    if (this.onEdit) {
      this.onEdit(this.start, this.end, this.setParams.bind(this), this); // Pass 'this' as filter
    }
  }

  setParams(start, end, rescaleByMedianFo = false) {
    this.start = start;
    this.end = end;
    this.rescaleByMedianFo = !!rescaleByMedianFo;
  }

  serialize() {
    return {
      type: "staticRatio",
      params: {
        start: this.start,
        end: this.end,
        rescaleByMedianFo: !!this.rescaleByMedianFo,
      },
    };
  }

  // Plate-wide per-indicator median Fo from the baseline window of the
  // current filteredData. Computed once, before the in-place division
  // below mutates filteredData. Median (not mean) is robust to dead wells.
  _computeMedianFoByIndicator(data) {
    if (!data || !data.length) return null;
    const numIndicators = data[0].indicators.length;
    const result = new Array(numIndicators);
    for (let i = 0; i < numIndicators; i++) {
      const nvs = [];
      for (let w = 0; w < data.length; w++) {
        const ind = data[w].indicators[i];
        if (!ind || !ind.filteredData) continue;
        let sum = 0;
        let ok = true;
        for (let s = this.start; s <= this.end; s++) {
          const pt = ind.filteredData[s];
          if (pt && typeof pt.y === "number" && !Number.isNaN(pt.y)) {
            sum += pt.y;
          } else {
            ok = false;
            break;
          }
        }
        if (ok) nvs.push(sum / (this.end - this.start + 1));
      }
      result[i] = medianOfArray(nvs);
    }
    return result;
  }

  execute(data) {
    // Compute the plate-wide median Fo per indicator BEFORE any division
    // mutates filteredData (the loop below normalizes in place).
    const medianFoByIndicator = this.rescaleByMedianFo
      ? this._computeMedianFoByIndicator(data)
      : null;

    for (let w = 0; w < data.length; ++w) {
      for (let i = 0; i < data[w].indicators.length; ++i) {
        for (let j = 0; j < data[w].indicators[i].rawData.length; ++j) {
          let sum = 0.0;

          // Calculate normalizing value (NV) based on the specified range
          for (let s = this.start; s <= this.end; s++) {
            if (
              data[w].indicators[i].filteredData[s] &&
              typeof data[w].indicators[i].filteredData[s].y === "number"
            ) {
              sum += data[w].indicators[i].filteredData[s].y;
            } else {
              console.error("Invalid data point at index", { i });
              return data[w].indicators[i].filteredData; // Return early if there's invalid data
            }
          }

          const NV = sum / (this.end - this.start + 1);

          // Normalize the data using the NV
          for (let k = 0; k < data[w].indicators[i].filteredData.length; ++k) {
            data[w].indicators[i].filteredData[k] = {
              x: data[w].indicators[i].rawData[k].x,
              y: data[w].indicators[i].filteredData[k].y / NV,
            };
          }
        }

        // Single post-division rescale by this indicator's plate-wide
        // median Fo. Applied ONCE per indicator here — NOT inside the
        // redundant j-loop above, which would compound the factor.
        if (medianFoByIndicator) {
          const m = medianFoByIndicator[i];
          if (typeof m === "number" && Number.isFinite(m)) {
            const fd = data[w].indicators[i].filteredData;
            for (let k = 0; k < fd.length; ++k) fd[k].y *= m;
          }
        }
      }
    }
  }
}

export class Smoothing_Filter {
  static desc =
    "Applies a moving average or median filter to smooth the data curve.";
  constructor(num, onEdit) {
    this.id = "smoothingFilter_" + JSON.stringify(num);
    this.name = "Smoothing";
    this.isEnabled = true;
    this.windowWidth = 5; // Moving window width
    this.useMedian = false; // New property to toggle median mode
    this.onEdit = onEdit;
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  setUseMedian(value) {
    this.useMedian = value; // Update the median mode
  }

  editParams() {
    if (this.onEdit) {
      this.onEdit(
        this.windowWidth,
        this.useMedian,
        this.setParams.bind(this),
        this
      ); // Pass 'this' as filter
    }
    console.log("Window width updated to:" + this.windowWidth);
  }

  setParams(windowWidth, useMedian) {
    this.windowWidth = windowWidth;
    this.useMedian = useMedian;
  }

  serialize() {
    return {
      type: "smoothing",
      params: { windowWidth: this.windowWidth, useMedian: this.useMedian },
    };
  }

  median(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  execute(data) {
    if (data.length < this.windowWidth) {
      console.error(
        `Insufficient data points for smoothing. Required: ${this.windowWidth}, Available: ${data.length}`
      );
      return data;
    }

    for (let w = 0; w < data.length; ++w) {
      for (let i = 0; i < data[w].indicators.length; ++i) {
        for (let j = 0; j < data[w].indicators[i].rawData.length; ++j) {
          let windowValues = [];
          let windowStart = Math.max(Math.floor(j - this.windowWidth / 2), 0);
          let windowEnd = Math.min(
            data[w].indicators[i].rawData.length - 1,
            j + this.windowWidth / 2
          );

          for (let k = windowStart; k <= windowEnd; k++) {
            try {
              windowValues.push(data[w].indicators[i].filteredData[k].y);
            } catch (err) {
              console.log(err);
            }
          }

          const smoothedValue = this.useMedian
            ? this.median(windowValues) // Use median if enabled
            : windowValues.reduce((sum, val) => sum + val, 0) /
              windowValues.length; // Otherwise, use average

          data[w].indicators[i].filteredData[j] = {
            x: data[w].indicators[i].rawData[j].x,
            y: smoothedValue,
          };
        }
      }
    }
  }
}

export class ControlSubtraction_Filter {
  static desc = "Subtracts the average control curve from apply wells.";
  constructor(num, onEdit, number_of_columns, number_of_rows) {
    this.id = "controlSubtraction_" + JSON.stringify(num);
    this.name = "Control Subtraction";
    this.isEnabled = true;
    // Ensure each instance gets its own arrays, not shared references
    this.controlWellArray = [];
    this.applyWellArray = [];
    this.number_of_columns = number_of_columns;
    this.number_of_rows = number_of_rows;
    this.onEdit = onEdit; // Callback to open the modal
    this.average_curve = [];
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  editParams() {
    if (this.onEdit) {
      // Always pass the filter instance itself
      this.onEdit(this);
    }
  }

  setParams(controlWellArray, applyWellArray) {
    this.controlWellArray = controlWellArray;
    this.applyWellArray = applyWellArray;
    console.log("control: ", controlWellArray);
    console.log("apply: ", applyWellArray);
  }

  serialize() {
    return {
      type: "controlSubtraction",
      params: {
        controlWellArray: this.controlWellArray,
        applyWellArray: this.applyWellArray,
        numberOfColumns: this.number_of_columns,
      },
    };
  }

  calculate_average_curve(wells) {
    console.log("avg curve calc");
    this.average_curve = Array(wells[0].indicators.length)
      .fill(null)
      .map(() => []);

    // Ensure control wells are available
    if (!this.controlWellArray.length) {
      console.error("No control wells defined.");
      return;
    }

    // Ensure filteredData and rawData have the same length in each well
    wells.forEach((well) => {
      well.indicators.forEach((indicator) => {
        const rawData = indicator.rawData;
        const filteredData = indicator.filteredData;

        // Check if rawData and filteredData have the same length, and pad them if needed
        const maxLength = Math.max(rawData.length, filteredData.length);

        while (filteredData.length < maxLength) {
          filteredData.push({ ...filteredData[filteredData.length - 1] });
        }

        while (rawData.length < maxLength) {
          rawData.push({ ...rawData[rawData.length - 1] });
        }

        for (let i = 1; i < rawData.length; i++) {
          if (!rawData[i] || rawData[i].x === undefined) {
            rawData[i] = { ...rawData[i - 1] };
          }
        }

        for (let i = 1; i < filteredData.length; i++) {
          if (!filteredData[i] || filteredData[i].y === undefined) {
            filteredData[i] = { ...filteredData[i - 1] };
          }
        }
      });
    });

    for (let i = 0; i < wells[0].indicators[0].rawData.length; i++) {
      for (let k = 0; k < wells[0].indicators.length; k++) {
        let avg = 0.0;
        let validControlCount = 0;

        for (let j = 0; j < this.controlWellArray.length; j++) {
          const row = this.controlWellArray[j].row;
          const col = this.controlWellArray[j].col;
          const ndx = row * this.number_of_columns + col;

          if (
            wells[ndx] &&
            wells[ndx].indicators[k] &&
            wells[ndx].indicators[k].filteredData[i]
          ) {
            avg += wells[ndx].indicators[k].filteredData[i].y;
            validControlCount++;
          } else {
            console.warn(
              `Filtered data missing for well at row ${row}, col ${col}`
            );
          }
        }

        avg = validControlCount > 0 ? avg / validControlCount : 0;

        const rawDataPoint = wells[0].indicators[k].rawData[i];
        if (rawDataPoint && rawDataPoint.x !== undefined) {
          this.average_curve[k].push({
            x: rawDataPoint.x,
            y: avg,
          });
        } else {
          console.warn(
            `Missing rawData for indicator at index ${k}, data point ${i}`
          );
        }
      }
    }

    console.log("avg curve: ", this.average_curve);
  }

  execute(data) {
    if (!this.controlWellArray.length || !this.applyWellArray.length) {
      console.error("Control or Apply well list is empty.");
      return data; // Return early if lists are empty
    }

    // Loop through apply wells
    for (let i = 0; i < this.applyWellArray.length; i++) {
      const row = this.applyWellArray[i].row;
      const col = this.applyWellArray[i].col;
      const ndx = row * this.number_of_columns + col;
      for (let m = 0; m < data[ndx].indicators.length; m++) {
        for (let n = 0; n < data[ndx].indicators[m].filteredData.length; n++) {
          data[ndx].indicators[m].filteredData[n] = {
            x: data[ndx].indicators[m].filteredData[n].x,
            y:
              data[ndx].indicators[m].filteredData[n].y -
                this.average_curve[m][n]?.y || 0, // the OR ZERO handles cases where one of the 'average_curve' arrays is shorter than the other
          };
        }
      }
    }
  }
}

export class Derivative_Filter {
  static desc = "Derivative Filter";
  constructor(num, onEdit) {
    this.id = "Derivative_" + JSON.stringify(num);
    this.name = "Derivative";

    this.isEnabled = true;
    this.onEdit = onEdit; // Callback to open the modal
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  serialize() {
    return { type: "derivative", params: {} };
  }

  execute(data) {
    for (let w = 0; w < data.length; w++) {
      for (let i = 0; i < data[w].indicators.length; i++) {
        for (let j = 0; j < data[w].indicators[i].filteredData.length; j++)
          if (j < data[w].indicators[i].filteredData.length - 1) {
            let x1 = data[w].indicators[i].filteredData[j].x;
            let x2 = data[w].indicators[i].filteredData[j + 1].x;
            let y1 = data[w].indicators[i].filteredData[j].y;
            let y2 = data[w].indicators[i].filteredData[j + 1].y;
            let slope = (y2 - y1) / (x2 - x1);
            data[w].indicators[i].filteredData[j] = {
              x: data[w].indicators[i].filteredData[j].x,
              y: slope,
            };
          } else {
            data[w].indicators[i].filteredData[j] = {
              x: data[w].indicators[i].filteredData[j].x,
              y: data[w].indicators[i].filteredData[j - 1].y,
            };
          }
      }
    }
  }
}

export class OutlierRemoval_Filter {
  static desc = "Outlier Removal";
  constructor(num, onEdit) {
    this.id = "outlierRemovalFilter_" + JSON.stringify(num);
    this.name = "Outlier Removal";

    this.isEnabled = true;
    this.halfWindow = 2;
    this.threshold = 3;
    this.onEdit = onEdit;
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  editParams() {
    if (this.onEdit) {
      this.onEdit(
        this.halfWindow,
        this.threshold,
        this.setParams.bind(this),
        this
      ); // Pass 'this' as filter
    }
  }

  setParams(halfWindow, threshold) {
    this.halfWindow = halfWindow;
    this.threshold = threshold;
  }

  serialize() {
    return {
      type: "outlierRemoval",
      params: { halfWindow: this.halfWindow, threshold: this.threshold },
    };
  }

  median(arr) {
    const sortedArr = arr.slice().sort((a, b) => a - b);
    const middle = Math.floor(sortedArr.length / 2);

    if (sortedArr.length % 2 === 0) {
      return (sortedArr[middle - 1] + sortedArr[middle]) / 2;
    } else {
      return sortedArr[middle];
    }
  }

  hampelFilter(data) {
    let threshold = this.threshold;
    let halfWindow = this.halfWindow;

    const n = data.length;
    const dataCopy = data.slice(); // Make a copy of the original data
    const outliers = [];
    const L = 1.4826; // Scaling factor for MAD

    for (let i = halfWindow; i < n - halfWindow; i++) {
      const windowData = data.slice(i - halfWindow, i + halfWindow + 1);
      const med = this.median(windowData);

      const MAD = L * this.median(windowData.map((val) => Math.abs(val - med)));

      if (Math.abs(data[i] - med) / MAD > threshold) {
        dataCopy[i] = med; // Replace outlier with the median
        outliers.push(i); // Store the index of the outlier
      }
    }

    return {
      data: dataCopy,
      outliers: outliers,
    };
  }

  execute(data) {
    // Ensure there's enough data to apply the Hampel filter
    for (let w = 0; w < data.length; ++w) {
      for (let i = 0; i < data[w].indicators.length; ++i) {
        const filteredData = data[w].indicators[i].filteredData;

        if (filteredData.length < this.halfWindow * 2 + 1) {
          console.error(
            `Insufficient data points for Hampel filter. Required: ${
              this.halfWindow * 2 + 1
            }, Available: ${filteredData.length}`
          );
          continue; // Skip this indicator if there aren't enough points
        }

        const filteredResult = this.hampelFilter(
          filteredData.map((point) => point.y) // Pass only the `y` values to the filter
        );

        // Update the filteredData with the Hampel-filtered values
        for (let j = 0; j < filteredData.length; ++j) {
          data[w].indicators[i].filteredData[j] = {
            x: filteredData[j].x, // Keep the original x values
            y: filteredResult.data[j], // Replace the y values with the filtered result
          };
        }

        console.log("Outliers removed at indices:", filteredResult.outliers);
      }
    }

    return data; // Return the filtered dataset
  }
}

export class FlatFieldCorrection_Filter {
  static desc = "Flat Field Correction";
  constructor(num, onEdit) {
    this.id = "flatfieldCorrection_" + JSON.stringify(num);
    this.name = "Flat Field Correction";

    this.isEnabled = false;
    this.correctionMatrix = [];
    this.onEdit = onEdit;
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  editParams() {
    if (this.onEdit) {
      this.onEdit(this.correctionMatrix, this.setParams.bind(this), this); // Pass 'this' as filter
    }
  }

  setParams(correctionMatrix) {
    this.correctionMatrix = correctionMatrix;
  }

  serialize() {
    return {
      type: "flatFieldCorrection",
      params: { correctionMatrix: this.correctionMatrix },
    };
  }

  execute(data) {
    for (let w = 0; w < data.length; w++) {
      if (data.length !== this.correctionMatrix.length) {
        console.warn(`Correction matrix does not match plate dimensions.`);
        continue; // Skip this indicator if lengths don't match
      }
      for (let i = 0; i < data[w].indicators.length; i++) {
        for (let j = 0; j < data[w].indicators[i].filteredData.length; j++) {
          data[w].indicators[i].filteredData[j] = {
            x: data[w].indicators[i].filteredData[j].x,
            y: (data[w].indicators[i].filteredData[j].y *=
              this.correctionMatrix[w]),
          };
        }
      }
    }
  }
}

export class DynamicRatio_Filter {
  static desc =
    "Divides the values from the designated 'Numerator' indicator by the corresponding values from the designated 'Denominator' indicator";
  constructor(num, onEdit) {
    this.id = "dynamicRatio_" + JSON.stringify(num);
    this.name = "Dynamic Ratio";
    this.isEnabled = true;
    this.numerator = 0;
    this.denominator = 1;
    this.onEdit = onEdit;
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  editParams() {
    if (this.onEdit) {
      this.onEdit(
        this.numerator,
        this.denominator,
        this.setParams.bind(this),
        this
      ); // Pass 'this' as filter
    }
  }

  setParams(numerator, denominator) {
    this.numerator = numerator;
    this.denominator = denominator;
  }

  serialize() {
    return {
      type: "dynamicRatio",
      params: { numerator: this.numerator, denominator: this.denominator },
    };
  }

  execute(data) {
    for (let w = 0; w < data.length; w++) {
      const numeratorData = data[w].indicators[this.numerator].filteredData;
      const denominatorData = data[w].indicators[this.denominator].filteredData;

      // Ensure both arrays are the same length by copying the last entry
      while (numeratorData.length < denominatorData.length) {
        numeratorData.push({ ...numeratorData[numeratorData.length - 1] });
      }
      while (denominatorData.length < numeratorData.length) {
        denominatorData.push({
          ...denominatorData[denominatorData.length - 1],
        });
      }

      const resultData = [];

      // Perform the division
      for (let j = 0; j < numeratorData.length; j++) {
        if (denominatorData[j].y === 0 || denominatorData[j].y === undefined) {
          console.warn(
            `Division by zero or invalid denominator data at well ${w}, index ${j}. Skipping this data point.`
          );
          continue; // Skip this data point
        }

        resultData.push({
          x: numeratorData[j].x,
          y: numeratorData[j].y / denominatorData[j].y,
        });
      }

      // Set both indicators' filteredData to the result
      data[w].indicators[this.numerator].filteredData = resultData;
      data[w].indicators[this.denominator].filteredData = resultData;
    }
  }
}

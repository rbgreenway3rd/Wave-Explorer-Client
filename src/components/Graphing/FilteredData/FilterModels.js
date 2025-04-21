export class StaticRatio_Filter {
  static desc = "Static Ratio filter";
  constructor(num, onEdit) {
    this.id = "staticRatio_" + JSON.stringify(num);
    this.name = "Static Ratio";
    // this.desc = "Static Ratio filter";
    this.isEnabled = true;
    this.start = 0;
    this.end = 5;
    this.onEdit = onEdit; // Callback to open the modal
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  editParams() {
    console.log("edit params clicked");
    if (this.onEdit) {
      this.onEdit(this.start, this.end, this.setParams.bind(this)); // Open the modal and pass the setter callback
    }
  }

  setParams(start, end) {
    this.start = start;
    this.end = end;
  }

  execute(data) {
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
      }
    }
  }
}

// export class Smoothing_Filter {
//   static desc = "Applies a moving average filter to smooth the data curve.";
//   constructor(num, onEdit) {
//     this.id = "smoothingFilter_" + JSON.stringify(num);
//     this.name = "Smoothing";
//     this.isEnabled = true;
//     this.windowWidth = 5; // Moving window width
//     this.onEdit = onEdit;
//   }

//   setEnabled(value) {
//     this.isEnabled = value;
//   }

//   editParams() {
//     if (this.onEdit) {
//       this.onEdit(this.windowWidth, this.setParams.bind(this)); // Open the modal and pass the setter callback
//     }
//     console.log("Window width updated to:" + this.windowWidth);
//   }

//   setParams(windowWidth) {
//     this.windowWidth = windowWidth;
//   }

//   execute(data) {
//     // Ensure there's enough data for the moving average
//     if (data.length < this.windowWidth) {
//       console.error(
//         `Insufficient data points for moving average. Required: ${this.windowWidth}, Available: ${data.length}`
//       );
//       return data; // Return original data if not enough points
//     }
//     for (let w = 0; w < data.length; ++w) {
//       for (let i = 0; i < data[w].indicators.length; ++i) {
//         for (let j = 0; j < data[w].indicators[i].rawData.length; ++j) {
//           let windowSum = 0;
//           let windowStart = Math.max(Math.floor(j - this.windowWidth / 2), 0);
//           let windowEnd = Math.min(
//             data[w].indicators[i].rawData.length - 1,
//             j + this.windowWidth / 2
//           );
//           for (let k = windowStart; k < windowEnd + 1; k++) {
//             // Sum up values in the initial window
//             try {
//               // windowSum += data[w].indicators[i].rawData[k].y;
//               windowSum += data[w].indicators[i].filteredData[k].y;
//             } catch (err) {
//               console.log(err);
//             }
//           }
//           data[w].indicators[i].filteredData[j] = {
//             x: data[w].indicators[i].rawData[j].x,
//             y: windowSum / (windowEnd - windowStart + 1),
//           };
//         }
//       }
//     }
//   }
// }
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
      this.onEdit(this.windowWidth, this.useMedian, this.setParams.bind(this)); // Pass the setter callback
    }
    console.log("Window width updated to:" + this.windowWidth);
  }

  setParams(windowWidth, useMedian) {
    this.windowWidth = windowWidth;
    this.useMedian = useMedian;
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
    this.controlWellArray = []; // list of {row, col} for control wells
    this.applyWellArray = []; // list of {row, col} for apply wells
    this.number_of_columns = number_of_columns; // Total columns in the grid layout (e.g., 24 for a 24x16 grid)
    this.number_of_rows = number_of_rows;
    this.onEdit = onEdit; // Callback to open the modal
    this.average_curve = [];
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  editParams() {
    if (this.onEdit) {
      // Opens a dialog to set controlWellArray and applyWellArray
      this.onEdit(
        this.controlWellArray,
        this.applyWellArray,
        this.setParams.bind(this)
      );
    }
  }

  setParams(controlWellArray, applyWellArray) {
    this.controlWellArray = controlWellArray;
    this.applyWellArray = applyWellArray;
    console.log("control: ", controlWellArray);
    console.log("apply: ", applyWellArray);
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
      this.onEdit(this.halfWindow, this.threshold, this.setParams.bind(this)); // Open the modal and pass the setter callback
    }
  }

  setParams(halfWindow, threshold) {
    this.halfWindow = halfWindow;
    this.threshold = threshold;
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
      this.onEdit(this.correctionMatrix, this.setParams.bind(this)); // Open the modal and pass the setter callback
    }
  }

  setParams(correctionMatrix) {
    this.correctionMatrix = correctionMatrix;
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
      this.onEdit(this.numerator, this.denominator, this.setParams.bind(this));
    }
  }

  setParams(numerator, denominator) {
    this.numerator = numerator;
    this.denominator = denominator;
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

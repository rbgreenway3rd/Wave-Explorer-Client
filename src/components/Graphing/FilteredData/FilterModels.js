export class StaticRatio_Filter {
  constructor(num, onEdit) {
    this.id = "staticRatio_" + JSON.stringify(num);
    this.name = "Static Ratio";
    this.desc = "Static Ratio filter";
    this.isEnabled = false;
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

export class Smoothing_Filter {
  constructor(num, onEdit) {
    this.id = "smoothingFilter_" + JSON.stringify(num);
    this.name = "Smoothing";
    this.desc = "Applies a moving average filter to smooth the data curve.";
    this.isEnabled = false;
    this.windowWidth = 5; // Moving window width
    this.onEdit = onEdit;
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  editParams() {
    if (this.onEdit) {
      this.onEdit(this.windowWidth, this.setParams.bind(this)); // Open the modal and pass the setter callback
    }
    console.log("Window width updated to:" + this.windowWidth);
  }

  setParams(windowWidth) {
    this.windowWidth = windowWidth;
  }

  execute(data) {
    // Ensure there's enough data for the moving average
    if (data.length < this.windowWidth) {
      console.error(
        `Insufficient data points for moving average. Required: ${this.windowWidth}, Available: ${data.length}`
      );
      return data; // Return original data if not enough points
    }
    for (let w = 0; w < data.length; ++w) {
      for (let i = 0; i < data[w].indicators.length; ++i) {
        for (let j = 0; j < data[w].indicators[i].rawData.length; ++j) {
          let windowSum = 0;
          let windowStart = Math.max(Math.floor(j - this.windowWidth / 2), 0);
          let windowEnd = Math.min(
            data[w].indicators[i].rawData.length - 1,
            j + this.windowWidth / 2
          );
          for (let k = windowStart; k < windowEnd + 1; k++) {
            // Sum up values in the initial window
            try {
              // windowSum += data[w].indicators[i].rawData[k].y;
              windowSum += data[w].indicators[i].filteredData[k].y;
            } catch (err) {
              console.log(err);
            }
          }
          data[w].indicators[i].filteredData[j] = {
            x: data[w].indicators[i].rawData[j].x,
            y: windowSum / (windowEnd - windowStart + 1),
          };
        }
      }
    }
  }
}

export class ControlSubtraction_Filter {
  constructor(num, onEdit, number_of_columns, number_of_rows) {
    this.id = "controlSubtraction_" + JSON.stringify(num);
    this.name = "Control Subtraction";
    this.desc = "Subtracts the average control curve from apply wells.";
    this.isEnabled = false;
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
    this.average_curve = [];

    // Ensure control wells are available
    if (!this.controlWellArray.length) {
      console.error("No control wells defined.");
      return;
    }

    // Loop through each data point (assumes rawData has same length across all wells)
    for (let i = 0; i < wells[0].indicators[0].rawData.length; i++) {
      // Loop over each indicator
      for (let k = 0; k < wells[0].indicators.length; k++) {
        let avg = 0.0;
        let validControlCount = 0; // Track valid control wells

        // Loop through each control well
        for (let j = 0; j < this.controlWellArray.length; j++) {
          const row = this.controlWellArray[j].row;
          const col = this.controlWellArray[j].col;
          const ndx = row * this.number_of_columns + col;

          // Check if filteredData is available for this well and indicator
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

        // Avoid division by zero
        if (validControlCount > 0) {
          avg = avg / validControlCount;
        } else {
          avg = 0; // No valid control wells, default to 0
        }

        // Add the calculated average to the curve
        this.average_curve.push({
          x: wells[0].indicators[k].rawData[i].x,
          y: avg,
        });
      }
    }

    console.log(this.average_curve);
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

      for (let i = 0; i < data[ndx].indicators.length; i++) {
        for (let j = 0; j < data[ndx].indicators[i].filteredData.length; j++) {
          data[ndx].indicators[i].filteredData[j] = {
            x: data[ndx].indicators[i].filteredData[j].x, // Keep x value unchanged
            y:
              data[ndx].indicators[i].filteredData[j].y -
              this.average_curve[j].y, // Subtract control average curve's y
          };
        }
      }
    }
  }
}

export class Derivative_Filter {
  constructor(num, onEdit) {
    this.id = "Derivative_" + JSON.stringify(num);
    this.name = "Derivative";
    this.desc = "Derivative filter";
    this.isEnabled = false;
    this.onEdit = onEdit; // Callback to open the modal
  }

  setEnabled(value) {
    this.isEnabled = value;
  }

  execute(data) {
    for (let w = 0; w < data.length; w++) {
      for (let i = 0; i < data[w].indicators.length; i++) {
        for (
          let j = 0;
          j < data[w].indicators[i].filteredData.length - 1;
          j++
        ) {
          let x1 = data[w].indicators[i].filteredData[j].x;
          let x2 = data[w].indicators[i].filteredData[j + 1].x;
          let y1 = data[w].indicators[i].filteredData[j].y;
          let y2 = data[w].indicators[i].filteredData[j + 1].y;
          let slope = (y2 - y1) / (x2 - x1);
          data[w].indicators[i].filteredData[j] = {
            x: data[w].indicators[i].filteredData[j].x,
            y: slope,
          };
        }
        data[w].indicators[i].filteredData.pop();
      }
    }
  }
}

export class OutlierRemoval_Filter {
  constructor(num, onEdit) {
    this.id = "outlierRemovalFilter_" + JSON.stringify(num);
    this.name = "Outlier Removal";
    this.desc = "Outlier Removal";
    this.isEnabled = false;
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
        const rawData = data[w].indicators[i].rawData;

        if (rawData.length < this.halfWindow * 2 + 1) {
          console.error(
            `Insufficient data points for Hampel filter. Required: ${
              this.halfWindow * 2 + 1
            }, Available: ${rawData.length}`
          );
          continue; // Skip this indicator if there aren't enough points
        }

        const filteredResult = this.hampelFilter(
          rawData.map((point) => point.y) // Pass only the `y` values to the filter
        );

        // Update the filteredData with the Hampel-filtered values
        for (let j = 0; j < rawData.length; ++j) {
          data[w].indicators[i].filteredData[j] = {
            x: rawData[j].x, // Keep the original x values
            y: filteredResult.data[j], // Replace the y values with the filtered result
          };
        }

        console.log("Outliers removed at indices:", filteredResult.outliers);
      }
    }

    return data; // Return the filtered dataset
  }
}

// export class DynamicRatio_Filter {
//   constructor(num) {
//     this.id = "dynamicRatio_" + JSON.stringify(num);
//     this.name = "Dynamic Ratio";
//     this.sourceWellList = []; // list of {row,col} tuples containing those wells to be used as source wells
//     this.destWellList = []; // list of {row,col} tuples containing those wells to be used as destination wells
//     this.isEnabled = false;
//   }

//   editParams() {
//     // opens dialog to edit sourceWellList and destWellList
//     // if "ok" pressed,
//   }

//   execute(wells) {}

//   setEnabled(value) {
//     this.isEnabled = value;
//   }
// }

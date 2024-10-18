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

export class DynamicRatio_Filter {
  constructor(num) {
    this.id = "dynamicRatio_" + JSON.stringify(num);
    this.name = "Dynamic Ratio";
    this.sourceWellList = []; // list of {row,col} tuples containing those wells to be used as source wells
    this.destWellList = []; // list of {row,col} tuples containing those wells to be used as destination wells
    this.isEnabled = false;
  }

  editParams() {
    // opens dialog to edit sourceWellList and destWellList
    // if "ok" pressed,
  }

  execute(wells) {}

  setEnabled(value) {
    this.isEnabled = value;
  }
}

export class Div_Filter {
  constructor(num) {
    this.id = "divFilter_" + JSON.stringify(num);
    this.name = "Divide Filter";
    this.desc = "Divide filter";
    this.isEnabled = false;
    this.divisor = 20;
  }
  editParams() {
    // opens dialog to edit start and end values
    // if "ok" pressed, set start and end to values set in dialog
    // else leave start and end as they were
  }
  execute(data) {
    let newData = [];
    for (let i = 0; i < data.length; i++) {
      newData.push({
        x: data[i].x,
        y: data[i].y / this.divisor,
      });
    }

    return newData;
  }

  setDivisor(value) {
    this.divisor = value;
  }

  setEnabled(value) {
    this.isEnabled = value;
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

    // const yFiltered = new Array(data.length).fill({ x: 0, y: 0 });
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

    // return yFiltered; // Return the smoothed array
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
    console.log(applyWellArray);
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

    // const yFiltered = [...data]; // Make a copy of the original data to modify

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

    // return yFiltered; // Return the adjusted data with subtracted control curve
  }
}

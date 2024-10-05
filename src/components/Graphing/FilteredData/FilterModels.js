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

  execute(filteredData) {
    // Ensure there's enough data in the filteredData array
    if (filteredData.length <= this.end) {
      console.error(
        "filteredData array does not have enough data points. Start: ${this.start}, End: , ${this.end}"
      );
      return filteredData;
    }

    let sum = 0.0;

    // Calculate normalizing value (NV) based on the specified range
    for (let i = this.start; i <= this.end; i++) {
      if (filteredData[i] && typeof filteredData[i].y === "number") {
        sum += filteredData[i].y;
      } else {
        console.error("Invalid data point at index", { i });
        return filteredData; // Return early if there's invalid data
      }
    }

    const NV = sum / (this.end - this.start + 1);

    // Normalize the data using the NV
    return filteredData.map((dataPoint) => {
      if (dataPoint && typeof dataPoint.y === "number") {
        return {
          x: dataPoint.x,
          y: dataPoint.y / NV,
        };
      }
      console.error("Invalid data point during normalization");
      return dataPoint; // Return the original point if something goes wrong
    });
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
        "Insufficient data points for moving average. Required: ${this.windowWidth}, Available: ${data.length}"
      );
      return data; // Return original data if not enough points
    }

    const yFiltered = new Array(data.length).fill({ x: 0, y: 0 });
    let windowSum = 0;

    for (let i = 0; i < data.length; ++i) {
      if (i < this.windowWidth) {
        // Sum up values in the initial window
        windowSum += data[i].y;
        yFiltered[i] = {
          x: data[i].x,
          y: windowSum / (i + 1),
        };
      } else {
        // Sliding window: subtract the value that's exiting the window and add the new one
        windowSum = windowSum - data[i - this.windowWidth].y + data[i].y;
        yFiltered[i] = {
          x: data[i].x,
          y: windowSum / this.windowWidth,
        };
      }
    }

    return yFiltered; // Return the smoothed array
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
  }

  execute(data) {
    if (!this.controlWellArray.length || !this.applyWellArray.length) {
      console.error("Control or apply well list is empty.");
      return data; // Return early if lists are empty
    }

    const num_points = data[0].y.length; // Assuming each well has the same number of data points (y-values)
    const average_control_curve = new Array(num_points).fill(0); // Initialize control average curve
    const yFiltered = new Array(data.length).fill({ x: 0, y: 0 });

    // Calculate the average data for control wells
    for (let i = 0; i < num_points; i++) {
      let control_avg = 0.0;

      for (let j = 0; j < this.controlWellArray.length; j++) {
        // Convert (row, col) to array index
        const { row, col } = this.controlWellArray[j];
        const ndx = row * this.number_of_columns + col;

        control_avg += data[ndx].y[i]; // Add the data point for each control well
      }

      control_avg = control_avg / this.controlWellArray.length; // Calculate the average
      average_control_curve[i] = control_avg; // Store the average in the curve
    }

    // Subtract the average control curve from each apply well
    for (let i = 0; i < this.applyWellArray.length; i++) {
      const { row, col } = this.applyWellArray[i];
      const ndx = row * this.number_of_columns + col;

      for (let j = 0; j < data[ndx].y.length; j++) {
        data[ndx].y[j] = data[ndx].y[j] - average_control_curve[j]; // Subtract the control average from each point
      }
    }

    return data; // Return the modified well data
  }
}

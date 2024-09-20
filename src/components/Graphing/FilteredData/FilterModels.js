// Filters = []

// let f = new StatiRatio_Filter()
// Filters.push(f)

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
        `filteredData array does not have enough data points. Start: ${this.start}, End: ${this.end}`
      );
      return filteredData;
    }

    let sum = 0.0;

    // Calculate normalizing value (NV) based on the specified range
    for (let i = this.start; i <= this.end; i++) {
      if (filteredData[i] && typeof filteredData[i].y === "number") {
        sum += filteredData[i].y;
      } else {
        console.error(`Invalid data point at index ${i}`);
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
      console.error(`Invalid data point during normalization`);
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

    // wells - wells element from the data context
    // for (let j = 0; j < wells.length; j++) {
    //   // normalize all wells with NV (i.e. divide all values by NV)
    //   for (let i = 0; i < wells[j].indicators[0].filteredData.length; i++) {
    //     wells[j].indicators[0].filteredData[i] = {
    //       x: wells[j].indicators[0].filteredData[i].x,
    //       y: wells[j].indicator[0].filteredData[i].y / this.divisor,
    //     };
    //   }
    // }
  }
  // execute(wells) {
  //   // wells - wells element from the data context
  //   for (let j = 0; j < wells.length; j++) {
  //     for (let k = 0; k < wells[j].indicator.length; k++) {
  //       // normalize all wells with NV (i.e. divide all values by NV)
  //       for (let i = 0; i < wells[j].indicator[k].filteredData.length; i++) {
  //         wells[j].indicator[k].filteredData[i] = {
  //           x: wells[j].indicator[k].filteredData[i].x,
  //           y: wells[j].indicator[k].filteredData[i].y / this.divisor,
  //         };
  //       }
  //     }
  //   }
  // }

  setDivisor(value) {
    this.divisor = value;
  }

  setEnabled(value) {
    this.isEnabled = value;
  }
}

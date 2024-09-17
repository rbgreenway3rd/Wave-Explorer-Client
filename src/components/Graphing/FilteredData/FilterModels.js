// Filters = []

// let f = new StatiRatio_Filter()
// Filters.push(f)

export class StaticRatio_Filter {
  constructor(num) {
    this.id = "staticRatio_" + JSON.stringify(num);
    this.name = "Static Ratio";
    this.desc = "Static Ratio filter";
    this.isEnabled = false;
    this.start = 0;
    this.end = 5;
  }
  editParams() {
    // opens dialog to edit start and end values
    // if "ok" pressed, set start and end to values set in dialog
    // else leave start and end as they were
  }
  execute(wells) {
    // wells - wells element from the data context
    for (let j = 0; j < wells.length; j++) {
      for (let k = 0; k < wells[j].indicator.length; k++) {
        let sum = 0.0;

        // find normalizing value (NV)
        for (let i = this.start; i <= this.end; i++) {
          sum += wells[j].indicator[k].filteredData[i].y;
        }
        let NV = sum / (this.end - this.start + 1);

        // normalize all wells with NV (i.e. divide all values by NV)
        for (let i = 0; i < wells[j].indicator[k].filteredData.length; i++) {
          wells[j].indicator[k].filteredData[i] = {
            x: wells[j].indicator[k].filteredData[i].x,
            y: wells[j].indicator[k].filteredData[i].y / NV,
          };
        }
      }
    }
  }

  setStart(value) {
    this.start = value;
  }
  setEnd(value) {
    this.end = value;
  }
  setEnabled(value) {
    this.isEnabled = value;
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
    this.divisor = 2;
  }
  editParams() {
    // opens dialog to edit start and end values
    // if "ok" pressed, set start and end to values set in dialog
    // else leave start and end as they were
  }
  execute(wells) {
    // wells - wells element from the data context
    for (let j = 0; j < wells.length; j++) {
      for (let k = 0; k < wells[j].indicator.length; k++) {
        // normalize all wells with NV (i.e. divide all values by NV)
        for (let i = 0; i < wells[j].indicator[k].filteredData.length; i++) {
          wells[j].indicator[k].filteredData[i] = {
            x: wells[j].indicator[k].filteredData[i].x,
            y: wells[j].indicator[k].filteredData[i].y / this.divisor,
          };
        }
      }
    }
  }

  setDivisor(value) {
    this.divisor = value;
  }

  setEnabled(value) {
    this.isEnabled = value;
  }
}

export class Project {
  constructor(title, date, time, protocol) {
    this.title = title;
    this.date = date;
    this.time = time;
    this.protocol = protocol;
    this.plate = [];
  }
}

export class Plate {
  constructor(numberOfRows, numberOfColumns) {
    this.numberOfRows = numberOfRows;
    this.numberOfColumns = numberOfColumns;
    this.plateDimensions = numberOfRows * numberOfColumns;
    this.experiments = [];
  }
}

export class Experiment {
  constructor(numberOfRows, numberOfColumns, indicatorConfigurations) {
    this.numberOfRows = numberOfRows;
    this.numberOfColumns = numberOfColumns;
    this.indicatorConfigurations = indicatorConfigurations;
    this.wells = [];
  }
}

export class Well {
  constructor(id, key, label, column, row) {
    this.id = id;
    this.key = key;
    this.label = label;
    this.column = column;
    this.row = row;
    this.indicators = []; // Array of Indicator instances
  }
}

export class Indicator {
  constructor(rawData, filteredData, isDisplayed) {
    // this.key = key;
    this.rawData = rawData;
    this.filteredData = filteredData;
    // this.time = time;
    this.isDisplayed = isDisplayed; // boolean
  }
}

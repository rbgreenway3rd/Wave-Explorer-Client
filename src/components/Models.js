export class Project {
  constructor(title, date, time, instrument, protocol) {
    this.title = title;
    this.date = date;
    this.time = time;
    this.instrument = instrument;
    this.protocol = protocol;
    this.plate = [];
  }
}

export class Plate {
  constructor(
    numberOfRows,
    numberOfColumns,
    assayPlateBarcode,
    addPlateBarcode
  ) {
    this.numberOfRows = numberOfRows;
    this.numberOfColumns = numberOfColumns;
    this.assayPlateBarcode = assayPlateBarcode;
    this.addPlateBarcode = addPlateBarcode;
    this.plateDimensions = numberOfRows * numberOfColumns;
    this.experiments = [];
  }
}

export class Experiment {
  constructor(
    binning,
    numberOfRows,
    numberOfColumns,
    indicatorConfigurations,
    operator
  ) {
    this.binning = binning;
    this.numberOfRows = numberOfRows;
    this.numberOfColumns = numberOfColumns;
    this.indicatorConfigurations = indicatorConfigurations;
    this.operator = operator;
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
  constructor(id, indicatorName, rawData, filteredData, time, isDisplayed) {
    this.id = id;
    this.indicatorName = indicatorName;
    this.rawData = rawData;
    this.filteredData = filteredData;
    this.time = time;
    this.isDisplayed = isDisplayed; // boolean
  }
  setDisplayed(value) {
    this.isDisplayed = value;
  }
}

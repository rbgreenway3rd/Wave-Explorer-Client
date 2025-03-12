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

    // New properties for calculated metrics
    this.APD90 = null;
    this.APD80 = null;
    this.APD70 = null;
    this.APD60 = null;
    this.APD50 = null;
    this.APD40 = null;
    this.APD30 = null;
    this.APD20 = null;
    this.APD10 = null;
    this.Num_Peaks_Detected = null;
    this.Num_Peaks_Analyzed = null;
    this.Peak_Amplitude = null;
    this.RR_Interval = null;
  }
  setDisplayed(value) {
    this.isDisplayed = value;
  }

  setMetrics(metrics) {
    this.APD90 = metrics.APD90;
    this.APD80 = metrics.APD80;
    this.APD70 = metrics.APD70;
    this.APD60 = metrics.APD60;
    this.APD50 = metrics.APD50;
    this.APD40 = metrics.APD40;
    this.APD30 = metrics.APD30;
    this.APD20 = metrics.APD20;
    this.APD10 = metrics.APD10;
    this.Num_Peaks_Detected = metrics.Num_Peaks_Detected;
    this.Num_Peaks_Analyzed = metrics.Num_Peaks_Analyzed;
    this.Peak_Amplitude = metrics.Peak_Amplitude;
    this.RR_Interval = metrics.RR_Interval;
  }
}

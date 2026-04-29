import { lttbTyped } from "../utilities/lttbTyped.js";

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

    // Typed-array primary storage for filtered data. After the filter
    // pipeline runs, these hold the canonical results — `filteredData`
    // becomes a stale {x,y}[] (or empty) and is rebuilt lazily only when
    // a Chart.js consumer asks for it via materializeFilteredData(). This
    // avoids the ~700MB transient allocation that otherwise OOMs the
    // renderer on huge (200MB+) DAT files.
    this.filteredXs = null;
    this.filteredYs = null;
    // Pre-decimated ~80-point {x,y}[] of the filtered signal — used by
    // the neural-analysis grid (and any other all-wells filtered preview)
    // so it doesn't have to materialize the full {x,y}[] for 96+ wells.
    this.miniFilteredPoints = null;

    // Same pattern for raw data after Phase C. distributeData populates
    // rawXs/rawYs at load time so we never allocate {x,y}[] for every
    // well. miniRawPoints is a small (~80-point) decimated copy used by
    // the all-wells mini-grid; full {x,y}[] form (cached on rawData) is
    // built only on demand via materializeRawData() — call this only for
    // the small set of selected wells.
    this.rawXs = null;
    this.rawYs = null;
    this.miniRawPoints = null;

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

  // Replace canonical filtered storage with typed arrays from the filter
  // worker. Invalidates the {x,y}[] cache — consumers that need point-array
  // form must call materializeFilteredData().
  setFilteredTypedArrays(xs, ys) {
    this.filteredXs = xs;
    this.filteredYs = ys;
    this.filteredData = []; // mark stale; do NOT allocate {x,y}[] here
    // Refresh the small decimated cache used by all-wells filtered previews.
    // ~80 points × 32B × wells ≈ 250KB per indicator — cheap.
    this.miniFilteredPoints = xs && ys ? lttbTyped(xs, ys, 80) : null;
  }

  // Build (and cache on `this.filteredData`) a {x,y}[] view of the filtered
  // data. Allocates ~32 bytes per point — only call this for indicators
  // you actually need to feed into Chart.js or a {x,y}-shaped API. Iterating
  // all wells with this method on a huge DAT file will OOM; use the typed
  // array fields directly when computing aggregate metrics.
  materializeFilteredData() {
    if (Array.isArray(this.filteredData) && this.filteredData.length > 0) {
      return this.filteredData;
    }
    const xs = this.filteredXs;
    const ys = this.filteredYs;
    if (!xs || !ys) return this.filteredData || [];
    const n = ys.length;
    const arr = new Array(n);
    for (let j = 0; j < n; j++) arr[j] = { x: xs[j], y: ys[j] };
    this.filteredData = arr;
    return arr;
  }

  // Raw-data twin of setFilteredTypedArrays. Populated by distributeData at
  // load time. Clears any cached {x,y}[] view in `rawData` and the small
  // miniRawPoints decimation — the caller (distributeData) is responsible
  // for repopulating miniRawPoints if it wants the mini-grid view.
  setRawTypedArrays(xs, ys) {
    this.rawXs = xs;
    this.rawYs = ys;
    this.rawData = [];
    this.miniRawPoints = null;
  }

  // Raw-data twin of materializeFilteredData. Builds {x,y}[] from rawXs /
  // rawYs on demand and caches in this.rawData. Same warning: do NOT
  // iterate-and-call across all wells on a huge file — allocate per-point
  // is expensive. Use rawXs/rawYs directly for aggregate metrics.
  materializeRawData() {
    if (Array.isArray(this.rawData) && this.rawData.length > 0) {
      return this.rawData;
    }
    const xs = this.rawXs;
    const ys = this.rawYs;
    if (!xs || !ys) return this.rawData || [];
    const n = ys.length;
    const arr = new Array(n);
    for (let j = 0; j < n; j++) arr[j] = { x: xs[j], y: ys[j] };
    this.rawData = arr;
    return arr;
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

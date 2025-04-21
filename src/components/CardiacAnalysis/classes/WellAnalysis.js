export class WellAnalysis {
  constructor(
    wellKey,
    column,
    row,
    numberOfPeaks,
    avgPTPTime,
    windowWidth,
    peakProminence,
    prominenceFactor,
    APDValues
  ) {
    this.wellKey = wellKey;
    this.column = column;
    this.row = row;
    this.numberOfPeaks = numberOfPeaks;
    this.avgPTPTime = avgPTPTime;
    this.windowWidth = windowWidth;
    this.peakProminence = peakProminence;
    this.prominenceFactor = prominenceFactor;
    this.APDValues = APDValues;
  }
}

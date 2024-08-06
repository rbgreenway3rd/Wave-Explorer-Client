// TOOLTIP ITEM CONTEXT
// The tooltip items passed to the tooltip callbacks implement the following interface.

const tooltipItem = {
  // The chart the tooltip is being shown on
  chart: Chart,

  // Label for the tooltip
  label: string,

  // Parsed data values for the given `dataIndex` and `datasetIndex`
  parsed: object,

  // Raw data values for the given `dataIndex` and `datasetIndex`
  raw: object,

  // Formatted value for the tooltip
  formattedValue: string,

  // The dataset the item comes from
  dataset: object,

  // Index of the dataset the item comes from
  datasetIndex: number,

  // Index of this data item in the dataset
  dataIndex: number,

  // The chart element (point, arc, bar, etc.) for this tooltip item
  element: Element,
};

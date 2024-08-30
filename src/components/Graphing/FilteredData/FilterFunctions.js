export const listOfFilters = [
  {
    name: "filter1",
    label: "Halve the values",
    apply: (data) =>
      data.map((well) => ({
        ...well,
        indicators: well.indicators.map((indicator) => ({
          ...indicator,
          filteredData: indicator.filteredData.map((value) => value / 2),
        })),
      })),
  },
  {
    name: "filter2",
    label: "Multiply values by 4",
    apply: (data) =>
      data.map((well) => ({
        ...well,
        indicators: well.indicators.map((indicator) => ({
          ...indicator,
          filteredData: indicator.filteredData.map((value) => value * 4),
        })),
      })),
  },
  {
    name: "filter3",
    label: "Max and Min values",
    apply: (data) =>
      data.map((well) => ({
        ...well,
        indicators: well.indicators.map((indicator) => {
          const maxVal = Math.max(...indicator.filteredData);
          const minVal = Math.min(...indicator.filteredData);
          return {
            ...indicator,
            filteredData: [minVal, maxVal],
          };
        }),
      })),
  },
  // Add more filters here
];

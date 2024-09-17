export const listOfFilters = [
  {
    name: "filter1",
    label: "Halve the values",
    apply: (data) =>
      data.map((well) => ({
        ...well,
        indicators: well.indicators.map((indicator) => ({
          ...indicator,
          filteredData: indicator.filteredData.map((value) => value.y / 2),
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
          filteredData: indicator.filteredData.map((value) => value.y * 4),
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
          const maxVal = Math.max(...indicator.filteredData); // does not work with tuple structure data
          const minVal = Math.min(...indicator.filteredData);
          return {
            ...indicator,
            filteredData: [minVal, maxVal],
          };
        }),
      })),
  },
  {
    name: "filter4",
    label: "Static Ratio",
    apply: (data) =>
      data.map((well) => ({
        ...well,
        indicators: well.indicators.map((indicator) => {
          let newFilteredData = [];
          let start = 2;
          let end = 6;
          let sum = 0.0;
          for (let i = start; i <= end; i++) {
            sum += indicator.filteredData[i].y;
          }
          let NV = sum / (end - start + 1);
          for (let i = 0; i < indicator.filteredData.length; i++) {
            // indicator.filteredData[i].y = indicator.filteredData[i].y / NV;
            let newFilteredDataTuple = {
              x: indicator.filteredData[i].x,
              y: indicator.filteredData[i].y / NV,
            };
            newFilteredData.push(newFilteredDataTuple);
          }

          // return indicator.filteredData;
          // console.log("static ratio res: ", indicator.filteredData);
          // console.log("NV: ", NV);
          // console.log("newFilteredData: ", newFilteredData);

          return {
            ...indicator,
            filteredData: newFilteredData,
          };
        }),
      })),
    // }),
  },
  // Add more filters here
];
// export const listOfFilters = [
//   {
//     name: "filter1",
//     label: "Halve the values",
//     apply: (project) =>
//       project.plate.map((p) =>
//         p.experiments.map((experiment) =>
//           experiment.wells.map((well) =>
//             well.indicators.map((indicator) => ({
//               ...indicator,
//               filteredData: indicator.filteredData.map((value) => ({
//                 ...value,
//                 y: value.y / 2,
//               })),
//             }))
//           )
//         )
//       ),
//   },
//   {
//     name: "filter2",
//     label: "Multiply values by 4",
//     apply: (project) =>
//       project.plate.map((p) =>
//         p.experiments.map((experiment) =>
//           experiment.wells.map((well) =>
//             well.indicators.map((indicator) => ({
//               ...indicator,
//               filteredData: indicator.filteredData.map((value) => ({
//                 ...value,
//                 y: value.y * 4,
//               })),
//             }))
//           )
//         )
//       ),
//   },
//   {
//     name: "filter3",
//     label: "Max and Min values",
//     apply: (project) =>
//       project.plate.map((p) =>
//         p.experiments.map((experiment) =>
//           experiment.wells.map((well) =>
//             well.indicators.map((indicator) => {
//               const maxVal = Math.max(
//                 ...indicator.filteredData.map((v) => v.y)
//               );
//               const minVal = Math.min(
//                 ...indicator.filteredData.map((v) => v.y)
//               );
//               return {
//                 ...indicator,
//                 filteredData: [
//                   { x: "min", y: minVal }, // WRONG
//                   { x: "max", y: maxVal },
//                 ],
//               };
//             })
//           )
//         )
//       ),
//   },
//   {
//     name: "filter4",
//     label: "Static Ratio",
//     apply: (project) =>
//       project.plate.map((p) =>
//         p.experiments.map((experiment) =>
//           experiment.wells.map((well) =>
//             well.indicators.map((indicator) => {
//               let start = 2;
//               let end = 6;
//               let sum = 0.0;
//               for (let i = start; i <= end; i++) {
//                 sum += indicator.filteredData[i].y;
//               }
//               let NV = sum / (end - start + 1);

//               const newFilteredData = indicator.filteredData.map((value) => ({
//                 ...value,
//                 y: value.y / NV,
//               }));

//               return {
//                 ...indicator,
//                 filteredData: newFilteredData,
//               };
//             })
//           )
//         )
//       ),
//   },
// ];

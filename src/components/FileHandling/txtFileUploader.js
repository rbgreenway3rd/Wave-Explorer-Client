// import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";
// import { DataContext } from "../../providers/DataProvider.js";
// import { useContext } from "react";

// const parseTxtFile = (fileContent) => {
//   const lines = fileContent.trim().split("\n");
//   const headers = lines[0].split("\t");
//   const times = [];
//   const data = {};

//   // Initialize data object with well labels as keys
//   headers.slice(1).forEach((header) => {
//     data[header] = [];
//   });

//   // Parse each line of the file
//   lines.slice(1).forEach((line) => {
//     const values = line.split("\t");
//     times.push(parseFloat(values[0] * 1000)); // Extract time value

//     // Extract data for each well
//     values.slice(1).forEach((value, index) => {
//       const well = headers[index + 1];
//       if (data[well]) {
//         data[well].push(parseFloat(value));
//       }
//     });
//   });

//   // Calculate the number of rows and columns
//   const uniqueLetters = new Set(headers.slice(1).map((header) => header[0]));
//   const numberOfRows = uniqueLetters.size;
//   const numberOfColumns = Math.max(
//     ...headers.slice(1).map((header) => parseInt(header.slice(1)))
//   );

//   console.log(times);
//   console.log(data);
//   console.log(numberOfRows);
//   console.log(numberOfColumns);
//   return { times, data, numberOfRows, numberOfColumns };
// };

// const extractAllDataFromTxt = (fileContent) => {
//   const parsedData = parseTxtFile(fileContent);
//   const { times, data, numberOfRows, numberOfColumns } = parsedData;

//   const rowLabels = [...new Set(Object.keys(data).map((label) => label[0]))];
//   const analysisData = data;

//   // Ensure the key remains a string
//   const extractedIndicatorTimes = {};
//   extractedIndicatorTimes["string"] = times;

//   const extractedProjectTitle = "Default Project Title";
//   const extractedProjectDate = new Date().toISOString().split("T")[0];
//   const extractedProjectTime = new Date()
//     .toISOString()
//     .split("T")[1]
//     .split(".")[0];
//   const extractedProjectInstrument = "Default Instrument";
//   const extractedProjectProtocol = "Default Protocol";
//   const extractedAssayPlateBarcode = "Default Assay Barcode";
//   const extractedAddPlateBarcode = "Default Add Barcode";
//   const extractedBinning = "Default Binning";
//   const extractedIndicatorConfigurations = [];
//   const extractedOperator = "Default Operator";
//   const extractedRows = parsedData.numberOfRows;
//   const extractedColumns = parsedData.numberOfColumns;

//   return {
//     rowLabels,
//     analysisData,
//     extractedIndicatorTimes,
//     extractedProjectTitle,
//     extractedProjectDate,
//     extractedProjectTime,
//     extractedProjectInstrument,
//     extractedProjectProtocol,
//     extractedAssayPlateBarcode,
//     extractedAddPlateBarcode,
//     extractedBinning,
//     extractedIndicatorConfigurations,
//     extractedOperator,
//     extractedRows,
//     extractedColumns,
//     numberOfRows,
//     numberOfColumns,
//   };
// };

// export const handleTxtFileUpload = async (fileContent) => {
//   return new Promise((resolve) => {
//     const extractedData = extractAllDataFromTxt(fileContent);
//     resolve(extractedData);
//   });
// };
import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";
import { DataContext } from "../../providers/DataProvider.js";
import { useContext } from "react";

const parseTxtFile = (fileContent) => {
  const lines = fileContent.trim().split("\n");
  //   const headers = lines[0].split("\t");
  const headers = lines[0].split("\t").map((header) => header.trim());
  const times = [];
  const data = {};
  console.log(headers);
  // Initialize data object with well labels as keys
  headers.slice(1).forEach((header) => {
    data[header] = [];
  });

  // Parse each line of the file
  lines.slice(1).forEach((line) => {
    const values = line.split("\t");
    times.push(parseFloat(values[0] * 1000)); // Extract time value

    // Extract data for each well
    values.slice(1).forEach((value, index) => {
      const well = headers[index + 1];
      if (data[well]) {
        data[well].push(parseFloat(value));
      }
    });
  });

  // Calculate the number of rows and columns
  const uniqueLetters = new Set(headers.slice(1).map((header) => header[0]));
  const numberOfRows = uniqueLetters.size;
  const numberOfColumns = Math.max(
    ...headers.slice(1).map((header) => parseInt(header.slice(1)))
  );

  console.log(times);
  console.log(data);
  console.log(numberOfRows);
  console.log(numberOfColumns);
  return { times, data, numberOfRows, numberOfColumns };
};

// const extractAllDataFromTxt = (fileContent) => {
//   const parsedData = parseTxtFile(fileContent);
//   const { times, data, numberOfRows, numberOfColumns } = parsedData;

//   const rowLabels = [...new Set(Object.keys(data).map((label) => label[0]))];
//   const analysisData = data;

//   // Ensure the key remains a string
//   const extractedIndicatorTimes = { string: times };

//   const extractedProjectTitle = "Default Project Title";
//   const extractedProjectDate = new Date().toISOString().split("T")[0];
//   const extractedProjectTime = new Date()
//     .toISOString()
//     .split("T")[1]
//     .split(".")[0];
//   const extractedProjectInstrument = "Default Instrument";
//   const extractedProjectProtocol = "Default Protocol";
//   const extractedAssayPlateBarcode = "Default Assay Barcode";
//   const extractedAddPlateBarcode = "Default Add Barcode";
//   const extractedBinning = "Default Binning";
//   const extractedIndicatorConfigurations = [];
//   const extractedOperator = "Default Operator";

//   return {
//     rowLabels,
//     analysisData,
//     extractedIndicatorTimes,
//     extractedProjectTitle,
//     extractedProjectDate,
//     extractedProjectTime,
//     extractedProjectInstrument,
//     extractedProjectProtocol,
//     extractedAssayPlateBarcode,
//     extractedAddPlateBarcode,
//     extractedBinning,
//     extractedIndicatorConfigurations,
//     extractedOperator,
//     numberOfRows,
//     numberOfColumns,
//   };
// };
const extractAllDataFromTxt = (fileContent) => {
  const parsedData = parseTxtFile(fileContent);
  const { times, data, numberOfRows, numberOfColumns } = parsedData;

  const rowLabels = [...new Set(Object.keys(data).map((label) => label[0]))];
  const analysisData = data;

  // Ensure the key remains a string
  const extractedIndicatorTimes = { string: times };

  const extractedProjectTitle = "Default Project Title";
  const extractedProjectDate = new Date().toISOString().split("T")[0];
  const extractedProjectTime = new Date()
    .toISOString()
    .split("T")[1]
    .split(".")[0];
  const extractedProjectInstrument = "Default Instrument";
  const extractedProjectProtocol = "Default Protocol";
  const extractedAssayPlateBarcode = "Default Assay Barcode";
  const extractedAddPlateBarcode = "Default Add Barcode";
  const extractedBinning = "Default Binning";
  const extractedIndicatorConfigurations = [];
  const extractedOperator = "Default Operator";

  return {
    rowLabels,
    analysisData,
    extractedIndicatorTimes,
    extractedProjectTitle,
    extractedProjectDate,
    extractedProjectTime,
    extractedProjectInstrument,
    extractedProjectProtocol,
    extractedAssayPlateBarcode,
    extractedAddPlateBarcode,
    extractedBinning,
    extractedIndicatorConfigurations,
    extractedOperator,
    numberOfRows,
    numberOfColumns,
  };
};

export const handleTxtFileUpload = async (fileContent) => {
  return new Promise((resolve) => {
    const extractedData = extractAllDataFromTxt(fileContent);
    resolve(extractedData);
  });
};

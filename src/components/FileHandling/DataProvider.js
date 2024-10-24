import React, { createContext, useState, useReducer, useEffect } from "react";

// Create context for data
export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // const [state, dispatch] = useReducer(dataReducer, initialState);
  // State variables to store extracted data
  const [extractedLines, setExtractedLines] = useState([]);
  const [extractedRows, setExtractedRows] = useState(0);
  const [extractedColumns, setExtractedColumns] = useState(0);
  const [extractedProjectTitle, setExtractedProjectTitle] = useState([]);
  const [extractedProjectDate, setExtractedProjectDate] = useState([]);
  const [extractedProjectTime, setExtractedProjectTime] = useState([]);
  const [extractedProjectInstrument, setExtractedProjectInstrument] = useState(
    []
  );
  const [extractedAssayPlateBarcode, setExtractedAssayPlateBarcode] = useState(
    []
  );
  const [extractedAddPlateBarcode, setExtractedAddPlateBarcode] = useState([]);
  const [extractedProjectProtocol, setExtractedProjectProtocol] = useState([]);
  const [extractedBinning, setExtractedBinning] = useState([]);
  const [
    extractedIndicatorConfigurations,
    setExtractedIndicatorConfigurations,
  ] = useState([]);
  const [extractedOperator, setExtractedOperator] = useState([]);
  const [extractedIndicatorTimes, setExtractedIndicatorTimes] = useState([]);
  const [analysisData, setAnalysisData] = useState([]);
  const [project, setProject] = useState(null);
  const [wellArrays, setWellArrays] = useState([]);
  const [wellArraysUpdated, setWellArraysUpdated] = useState(false);
  const [selectedWellArray, setSelectedWellArray] = useState([]);

  // state handling selected and enabled filters
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [enabledFilters, setEnabledFilters] = useState([]);

  // state determining what data is shown in minigraph-grid (rawData or filteredData)
  const [showFiltered, setShowFiltered] = useState(false);
  // state handling what selected well in minigraphgrid is hovered
  // -> -> sends state to LargeGraph.js

  useEffect(() => {
    // Compute wellArrays whenever the project changes
    const plate = project?.plate || [];
    const experiment = plate[0]?.experiments[0] || {};
    const updatedWellArrays = experiment.wells || [];
    setWellArrays(updatedWellArrays); // Update wellArrays based on current project
  }, [project]);

  // Function to set wellArrays from outside
  const updateWellArrays = (newWellArrays) => {
    setWellArrays(newWellArrays);
  };

  // functions handling selectedWellArray management
  const handleSelectWell = (well) => {
    setSelectedWellArray((prevArray) => [...prevArray, well]);
  };

  const handleDeselectWell = (wellToRemove) => {
    setSelectedWellArray((prevArray) =>
      prevArray.filter((well) => well !== wellToRemove)
    );
  };

  const handleClearSelectedWells = () => {
    setSelectedWellArray([]);
  };

  // Function to extract project title from content
  const extractProjectTitle = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("Project"));
    const endIndex = lines.findIndex((line) => line.includes("</HEADER>"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex, startIndex + 1);
    }
    return [];
  };

  // Function to extract project date from content
  const extractProjectDate = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("<HEADER>"));
    const endIndex = lines.findIndex((line) => line.includes("Time"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };

  // Function to extract project time from content
  const extractProjectTime = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("Date"));
    const endIndex = lines.findIndex((line) => line.includes("Instrument"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };

  const extractInstrument = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("Time"));
    const endIndex = lines.findIndex((line) => line.includes("ProtocolName"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };

  // Function to extract project protocol from content
  const extractProjectProtocol = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("Instrument"));
    const endIndex = lines.findIndex((line) =>
      line.includes("AssayPlateBarcode")
    );
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };

  // Function to extract indicator configurations from content
  const extractIndicatorConfigurations = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) =>
      line.includes("AddPlateBarcode	S")
    );
    const endIndex = lines.findIndex((line) => line.includes("Binning"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };

  const extractOperator = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("NumCols"));
    const endIndex = lines.findIndex((line) => line.includes("Project"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };

  const extractAssayPlateBarcode = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("ProtocolName"));
    const endIndex = lines.findIndex((line) =>
      line.includes("AddPlateBarcode")
    );
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };

  const extractAddPlateBarcode = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) =>
      line.includes("AssayPlateBarcode")
    );
    const endIndex = lines.findIndex((line) => line.includes("Indicator"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };
  const extractBinning = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("Indicator"));
    const endIndex = lines.findIndex((line) => line.includes("NumRows"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    return [];
  };

  // Function to extract number of rows from content
  const extractNumberOfRows = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("NumRows"));
    const endIndex = lines.findIndex((line) => line.includes("NumCols"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const numRowsLine = lines[startIndex];
      return parseInt(numRowsLine.replace(/[^\d]/g, ""), 10); // removes all non-digit characters
    }
    return 0; // Return 0 when NumRows is not found
  };

  // Function to extract number of columns from content
  const extractNumberOfColumns = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("NumCols"));
    const endIndex = lines.findIndex((line) => line.includes("Operator"));
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const numColsLine = lines[startIndex];
      return parseInt(numColsLine.replace(/[^\d]/g, ""), 10); // removes all non-digit characters
    }
    return 0; // Return 0 when NumCols is not found
  };

  // Function to extract lines related to indicators from content
  const extractLines = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("P24"));
    const endIndex = lines.findIndex((line) =>
      line.includes("</INDICATOR_DATA>")
    );
    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      return lines.slice(startIndex + 1, endIndex);
    }
    console.log(lines);
    return [];
  };

  // Function to extract indicator times and analysis data from lines
  const extractIndicatorTimes = (extractedLines) => {
    const joinedLines = extractedLines.join("");
    const elements = joinedLines.split("\t").slice(0, -1);
    let extractedIndicatorTimes = []; // Time values pulled from extractedLines
    let analysisData = []; // Datapoints to be sorted by well; pulled from extractedLines
    for (let i = 0; i < elements.length; i++) {
      if (i % 385 === 0) {
        extractedIndicatorTimes.push(
          parseFloat(elements[i].replace("\r", "") * 1000)
        );
      } else {
        analysisData.push(parseFloat(elements[i]));
      }
    }
    // console.log("Extracted Indicator Times:", extractedIndicatorTimes);
    // console.log("Analysis Data:", analysisData);
    setExtractedIndicatorTimes(extractedIndicatorTimes);
    setAnalysisData(analysisData);
    return { extractedIndicatorTimes, analysisData };
  };

  // Function to handle the entire asynchronous extraction process and update state
  async function extractAllData(content) {
    let extractedLines = await extractLines(content);
    let extractedRows = await extractNumberOfRows(content);
    let extractedColumns = await extractNumberOfColumns(content);
    let extractedProjectTitle = await extractProjectTitle(content);
    let extractedProjectDate = await extractProjectDate(content);
    let extractedProjectTime = await extractProjectTime(content);
    let extractedProjectInstrument = await extractInstrument(content);
    let extractedProjectProtocol = await extractProjectProtocol(content);
    let extractedAssayPlateBarcode = await extractAssayPlateBarcode(content);
    let extractedAddPlateBarcode = await extractAddPlateBarcode(content);
    let extractedBinning = await extractBinning(content);
    let extractedIndicatorConfigurations = await extractIndicatorConfigurations(
      content
    );
    let extractedOperator = await extractOperator(content);

    setExtractedProjectTitle(extractedProjectTitle);
    setExtractedProjectDate(extractedProjectDate);
    setExtractedProjectTime(extractedProjectTime);
    setExtractedProjectInstrument(extractedProjectInstrument);
    setExtractedProjectProtocol(extractedProjectProtocol);
    setExtractedAssayPlateBarcode(extractedAssayPlateBarcode);
    setExtractedAddPlateBarcode(extractedAddPlateBarcode);
    setExtractedBinning(extractedBinning);
    setExtractedIndicatorConfigurations(extractedIndicatorConfigurations);
    setExtractedOperator(extractedOperator);
    setExtractedRows(extractedRows);
    setExtractedColumns(extractedColumns);
    setExtractedLines(extractedLines);

    let { extractedIndicatorTimes, analysisData } = await extractIndicatorTimes(
      extractedLines
    );

    return {
      extractedLines,
      extractedRows,
      extractedColumns,
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
      extractedIndicatorTimes,
      analysisData,
    };
  }

  return (
    <DataContext.Provider
      value={{
        extractedLines,
        extractedRows,
        extractedColumns,
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
        extractAllData,
        extractIndicatorTimes,
        extractedIndicatorTimes,
        analysisData,
        project,
        setProject,
        wellArrays, // Expose wellArrays to all components
        updateWellArrays, // Provide function to update wellArrays to all components
        wellArraysUpdated,
        setWellArraysUpdated,
        showFiltered,
        setShowFiltered,
        selectedWellArray,
        setSelectedWellArray,
        selectedFilters,
        setSelectedFilters,
        enabledFilters,
        setEnabledFilters,
        // hoveredSelectedWellId,
        // setHoveredSelectedWellId,
        handleSelectWell,
        handleDeselectWell,
        handleClearSelectedWells,
        // annotationRangeStart,
        // setAnnotationRangeStart,
        // annotationRangeEnd,
        // setAnnotationRangeEnd,
      }}
    >
      {children} {/* Provide context to children components */}
    </DataContext.Provider>
  );
};

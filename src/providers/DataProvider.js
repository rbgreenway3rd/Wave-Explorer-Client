import React, { createContext, useState, useReducer, useEffect } from "react";

// Create context for data
export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // State variables to store extracted data
  const [extractedLines, setExtractedLines] = useState([]);
  const [extractedRows, setExtractedRows] = useState(0);
  const [rowLabels, setRowLabels] = useState([]);
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
  const [globalMaxY, setGlobalMaxY] = useState(undefined);
  const [wellArraysUpdated, setWellArraysUpdated] = useState(false);
  const [selectedWellArray, setSelectedWellArray] = useState([]);
  const [overlayRawAndFiltered, setOverlayRawAndFiltered] = useState(false);

  // TESTING
  const [extractedIndicators, setExtractedIndicators] = useState([]);
  const [selectedIndicators, setSelectedIndicators] = useState([0]);

  // state handling selected and enabled filters
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [enabledFilters, setEnabledFilters] = useState([]);

  // state handling new uploaded filters
  const [uploadedFilters, setUploadedFilters] = useState([]);

  // state determining what data is shown in minigraph-grid (rawData or filteredData)
  const [showFiltered, setShowFiltered] = useState(false);

  // state handling saved metrics
  const [savedMetrics, setSavedMetrics] = useState([]);

  // state handling annotations
  const [annotations, setAnnotations] = useState([]);

  // new state for max points
  const [maxPoints, setMaxPoints] = useState(0);

  useEffect(() => {
    // Compute wellArrays whenever the project changes
    const plate = project?.plate || [];
    const experiment = plate[0]?.experiments[0] || {};
    const updatedWellArrays = experiment.wells || [];
    setWellArrays(updatedWellArrays); // Update wellArrays based on current project

    // Calculate maxPoints for all displayed indicators (raw and filtered)
    let maxCount = 0;
    updatedWellArrays.forEach((well) => {
      well.indicators?.forEach((indicator) => {
        if (indicator.isDisplayed) {
          const rawLen = Array.isArray(indicator.rawData)
            ? indicator.rawData.length
            : 0;
          const filteredLen = Array.isArray(indicator.filteredData)
            ? indicator.filteredData.length
            : 0;
          maxCount = Math.max(maxCount, rawLen, filteredLen);
        }
      });
    });
    setMaxPoints(maxCount);

    // Calculate globalMaxY across all wells and all indicators
    let maxY = -Infinity;
    updatedWellArrays.forEach((well) => {
      well.indicators?.forEach((indicator) => {
        // Check both rawData and filteredData for y values
        [indicator.rawData, indicator.filteredData].forEach((dataArr) => {
          if (Array.isArray(dataArr)) {
            dataArr.forEach((pt) => {
              if (pt && typeof pt.y === "number" && pt.y > maxY) {
                maxY = pt.y;
              }
            });
          }
        });
      });
    });
    setGlobalMaxY(maxY === -Infinity ? undefined : maxY);
  }, [project]);

  // Function to set wellArrays from outside
  const updateWellArrays = (newWellArrays) => {
    setWellArrays(newWellArrays);
  };

  // functions handling selectedWellArray management
  const handleSelectWell = (well) => {
    setSelectedWellArray((prevArray) => [...prevArray, well]);
  };

  const handleDeselectWell = (wellIdToRemove) => {
    setSelectedWellArray((prevArray) =>
      prevArray.filter((well) => well.id !== wellIdToRemove)
    );
  };

  const handleClearSelectedWells = () => {
    setSelectedWellArray([]);
  };

  // Generate row labels based on extractedRows
  const generateRowLabels = (extractedRows) => {
    const labels = [];
    for (let i = 0; i < extractedRows; i++) {
      let label = "";
      let n = i;
      while (n >= 0) {
        label = String.fromCharCode((n % 26) + 65) + label;
        n = Math.floor(n / 26) - 1;
      }
      labels.push(label);
    }
    return labels;
  };

  // Function to extract project title from content

  const extractProjectTitle = (content) => {
    const lines = content.split("\n"); // Split content into lines
    const startIndex = lines.findIndex((line) => line.includes("Project")); // Find the line containing 'Project'

    if (startIndex !== -1) {
      // Split the line by tab and return the second part (after 'Project')
      const projectLine = lines[startIndex];
      const projectParts = projectLine.split("\t"); // Split by tab

      if (projectParts.length > 1) {
        return projectParts[1].trim(); // Return the project title without extra spaces or characters
      }
    }

    return ""; // Return an empty string if no project title is found
  };

  // Function to extract project date from content
  const extractProjectDate = (content) => {
    const lines = content.split("\n"); // Split content into lines
    const startIndex = lines.findIndex((line) => line.includes("Date")); // Find the line containing 'Date'

    if (startIndex !== -1) {
      // Split the line by tab and return the second part (the date)
      const dateLine = lines[startIndex];
      const dateParts = dateLine.split("\t"); // Split by tab

      if (dateParts.length > 1) {
        return dateParts[1].trim(); // Return the date, removing any extra spaces or characters
      }
    }

    return ""; // Return an empty string if no date is found
  };

  const extractProjectTime = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("Time")); // Find the line with 'Time'

    if (startIndex !== -1) {
      const timeLine = lines[startIndex];
      const timeParts = timeLine.split("\t"); // Split by tab

      if (timeParts.length > 1) {
        return timeParts[1].trim(); // Return the clean time value
      }
    }

    return ""; // Return empty string if not found
  };

  const extractInstrument = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("Instrument"));

    if (startIndex !== -1) {
      const instrumentLine = lines[startIndex];
      const instrumentParts = instrumentLine.split("\t");

      if (instrumentParts.length > 1) {
        return instrumentParts[1].trim();
      }
    }

    return "";
  };

  const extractProjectProtocol = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("ProtocolName"));

    if (startIndex !== -1) {
      const protocolLine = lines[startIndex];
      const protocolParts = protocolLine.split("\t");

      if (protocolParts.length > 1) {
        return protocolParts[1].trim();
      }
    }

    return "";
  };

  const extractIndicatorConfigurations = (content) => {
    const lines = content.split("\n");
    const indicatorConfigurations = [];

    lines.forEach((line) => {
      if (line.includes("Indicator")) {
        const parts = line.split("\t");

        if (parts.length >= 9) {
          // Ensure there are enough parts to extract all fields
          const config = {
            name: parts[1].trim(),
            Excitation: parts[3].trim(),
            Emission: parts[5].trim(),
            Exposure: parts[7].trim(),
            Gain: parts[9].trim(),
          };
          indicatorConfigurations.push(config);
        }
      }
    });

    return indicatorConfigurations;
  };

  const extractOperator = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("NumCols"));
    const endIndex = lines.findIndex((line) => line.includes("Project"));

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const operatorLine = lines.slice(startIndex + 1, endIndex)[0];
      // Split by tabs, slice to exclude "Operator", and trim each part
      return operatorLine
        .split("\t")
        .slice(1)
        .map((part) => part.trim());
    }

    return [];
  };

  const extractAssayPlateBarcode = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) =>
      line.includes("AssayPlateBarcode")
    );

    if (startIndex !== -1) {
      const barcodeLine = lines[startIndex];
      const barcodeParts = barcodeLine.split("\t");

      if (barcodeParts.length > 1) {
        return barcodeParts[1].trim();
      }
    }

    return "";
  };

  const extractAddPlateBarcode = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) =>
      line.includes("AddPlateBarcode")
    );

    if (startIndex !== -1) {
      const barcodeLine = lines[startIndex];
      const barcodeParts = barcodeLine.split("\t");

      if (barcodeParts.length > 1) {
        return barcodeParts[1].trim();
      }
    }

    return "";
  };

  const extractBinning = (content) => {
    const lines = content.split("\n");
    const startIndex = lines.findIndex((line) => line.includes("Binning"));

    if (startIndex !== -1) {
      const binningLine = lines[startIndex];
      const binningParts = binningLine.split("\t");

      if (binningParts.length > 1) {
        return binningParts[1].trim();
      }
    }

    return "";
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

  const findLinesWith = (lines, matchString) => {
    // const lines = content.split("\n"); // Split content into lines
    let ndxs = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(matchString)) {
        ndxs.push(i);
      }
      // console.log("findLinesWith: ", lines);
    }
    return ndxs;
  };

  const getItem = (line, ndx) => {
    let tokens = line.split("\t");
    // console.log("getItem tokens: ", tokens[ndx]);
    return tokens[ndx];
  };

  const getIndicators = (content) => {
    const lines = content.split("\n"); // Split content into lines

    let indicators = [];
    let startNdxs = findLinesWith(lines, "<INDICATOR_DATA");
    let endNdxs = findLinesWith(lines, "</INDICATOR_DATA>");

    for (let i = 0; i < startNdxs.length; i++) {
      let indicatorName = getItem(lines[startNdxs[i]], 1); // Assuming 'New Green' is the second tab-separated item
      let startIndex = startNdxs[i];
      let endIndex = endNdxs[i];
      indicators.push({ id: i, indicatorName, startIndex, endIndex });
    }

    // console.log("indicators: ", indicators);
    return indicators;
  };

  const extractLines = (content, indicators) => {
    const lines = content.split("\n");
    let extractedLinesByIndicator = {};

    indicators.forEach(({ indicatorName, startIndex, endIndex }) => {
      extractedLinesByIndicator[indicatorName] = lines.slice(
        startIndex + 2,
        endIndex
      );
    });

    // console.log("Extracted Lines by Indicator:", extractedLinesByIndicator);
    return extractedLinesByIndicator;
  };

  const extractIndicatorTimes = (
    extractedLinesByIndicator,
    extractedRows,
    extractedColumns
  ) => {
    let indicatorTimes = {};
    let analysisData = {};
    const plateDimensions = extractedRows * extractedColumns;

    for (let indicator in extractedLinesByIndicator) {
      const extractedLines = extractedLinesByIndicator[indicator];

      let times = [];
      let dataPoints = [];

      // Iterate through each line in extractedLines
      for (let i = 0; i < extractedLines.length; i++) {
        // Split the line into elements by tab delimiter
        const lineElements = extractedLines[i].split("\t");

        // Push the first element (time) to the times array
        // times.push(parseFloat(lineElements[0].replace("\r", "")) * 1000);
        times.push(parseFloat(lineElements[0].replace("\r", "")));

        // Push all other elements (data points) to the dataPoints array
        for (let j = 1; j < lineElements.length; j++) {
          const dataPoint = parseFloat(lineElements[j].replace("\r", ""));
          if (!isNaN(dataPoint)) {
            dataPoints.push(dataPoint);
          }
        }
      }

      // Assign the extracted times and data points to their respective indicators
      indicatorTimes[indicator] = times;
      analysisData[indicator] = dataPoints;
    }

    // console.log("Extracted Indicator Times:", indicatorTimes);
    console.log("Analysis Data by Indicator:", analysisData);

    // Set or return the values as needed
    setExtractedIndicatorTimes(indicatorTimes);
    setAnalysisData(analysisData);
    // console.log(indicatorTimes, analysisData);
    return { indicatorTimes, analysisData };
  };

  // Import the worker (Vite/CRA: use new URL)
  const extractWorker = new Worker(
    new URL("../workers/extractWorker.js", import.meta.url)
  );

  // Function to handle the entire asynchronous extraction process and update state using a Web Worker
  function extractAllData(content) {
    return new Promise((resolve) => {
      extractWorker.onmessage = (e) => {
        const result = e.data;
        // Update all state with the result from the worker
        setExtractedIndicators(result.extractedIndicators);
        setExtractedLines(result.extractedLines);
        setExtractedRows(result.extractedRows);
        setRowLabels(result.rowLabels);
        setExtractedColumns(result.extractedColumns);
        setExtractedProjectTitle(result.extractedProjectTitle);
        setExtractedProjectDate(result.extractedProjectDate);
        setExtractedProjectTime(result.extractedProjectTime);
        setExtractedProjectInstrument(result.extractedProjectInstrument);
        setExtractedProjectProtocol(result.extractedProjectProtocol);
        setExtractedAssayPlateBarcode(result.extractedAssayPlateBarcode);
        setExtractedAddPlateBarcode(result.extractedAddPlateBarcode);
        setExtractedBinning(result.extractedBinning);
        setExtractedIndicatorConfigurations(
          result.extractedIndicatorConfigurations
        );
        setExtractedOperator(result.extractedOperator);
        setExtractedIndicatorTimes(result.extractedIndicatorTimes);
        setAnalysisData(result.analysisData);
        resolve(result);
      };
      extractWorker.postMessage({ content });
    });
  }

  return (
    <DataContext.Provider
      value={{
        extractedIndicators,
        extractedLines,
        extractedRows,
        rowLabels,
        setRowLabels,
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
        setExtractedIndicatorTimes,
        analysisData,
        setAnalysisData,
        project,
        setProject,
        wellArrays, // Expose wellArrays to all components
        setWellArrays,
        updateWellArrays, // Provide function to update wellArrays to all components
        wellArraysUpdated,
        setWellArraysUpdated,
        showFiltered,
        setShowFiltered,
        selectedWellArray,
        setSelectedWellArray, // <-- Expose this for batch selection
        handleSelectWell,
        handleDeselectWell,
        handleClearSelectedWells,
        selectedFilters,
        setSelectedFilters,
        enabledFilters,
        setEnabledFilters,
        uploadedFilters,
        setUploadedFilters,
        savedMetrics,
        setSavedMetrics,
        annotations,
        setAnnotations,
        overlayRawAndFiltered,
        setOverlayRawAndFiltered,
        maxPoints, // <-- provide maxPoints in context
        setMaxPoints,
        globalMaxY,
        setGlobalMaxY,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

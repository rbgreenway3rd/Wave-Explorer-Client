// src/workers/extractWorker.js

// All pure helper functions from DataProvider.js (no React state, no imports)

function generateRowLabels(extractedRows) {
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
}

function extractProjectTitle(content) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) => line.includes("Project"));
  if (startIndex !== -1) {
    const projectLine = lines[startIndex];
    const projectParts = projectLine.split("\t");
    if (projectParts.length > 1) {
      return projectParts[1].trim();
    }
  }
  return "";
}

function extractProjectDate(content) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) => line.includes("Date"));
  if (startIndex !== -1) {
    const dateLine = lines[startIndex];
    const dateParts = dateLine.split("\t");
    if (dateParts.length > 1) {
      return dateParts[1].trim();
    }
  }
  return "";
}

function extractProjectTime(content) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) => line.includes("Time"));
  if (startIndex !== -1) {
    const timeLine = lines[startIndex];
    const timeParts = timeLine.split("\t");
    if (timeParts.length > 1) {
      return timeParts[1].trim();
    }
  }
  return "";
}

function extractInstrument(content) {
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
}

function extractProjectProtocol(content) {
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
}

function extractIndicatorConfigurations(content) {
  const lines = content.split("\n");
  const indicatorConfigurations = [];
  lines.forEach((line) => {
    if (line.includes("Indicator")) {
      const parts = line.split("\t");
      if (parts.length >= 9) {
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
}

function extractOperator(content) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) => line.includes("NumCols"));
  const endIndex = lines.findIndex((line) => line.includes("Project"));
  if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    const operatorLine = lines.slice(startIndex + 1, endIndex)[0];
    return operatorLine
      .split("\t")
      .slice(1)
      .map((part) => part.trim());
  }
  return [];
}

function extractAssayPlateBarcode(content) {
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
}

function extractAddPlateBarcode(content) {
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
}

function extractBinning(content) {
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
}

function extractNumberOfRows(content) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) => line.includes("NumRows"));
  const endIndex = lines.findIndex((line) => line.includes("NumCols"));
  if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    const numRowsLine = lines[startIndex];
    return parseInt(numRowsLine.replace(/[^\d]/g, ""), 10);
  }
  return 0;
}

function extractNumberOfColumns(content) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) => line.includes("NumCols"));
  const endIndex = lines.findIndex((line) => line.includes("Operator"));
  if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    const numColsLine = lines[startIndex];
    return parseInt(numColsLine.replace(/[^\d]/g, ""), 10);
  }
  return 0;
}

function findLinesWith(lines, matchString) {
  let ndxs = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(matchString)) {
      ndxs.push(i);
    }
  }
  return ndxs;
}

function getItem(line, ndx) {
  let tokens = line.split("\t");
  return tokens[ndx];
}

function getIndicators(content) {
  const lines = content.split("\n");
  let indicators = [];
  let startNdxs = findLinesWith(lines, "<INDICATOR_DATA");
  let endNdxs = findLinesWith(lines, "</INDICATOR_DATA>");
  for (let i = 0; i < startNdxs.length; i++) {
    let indicatorName = getItem(lines[startNdxs[i]], 1);
    let startIndex = startNdxs[i];
    let endIndex = endNdxs[i];
    indicators.push({ id: i, indicatorName, startIndex, endIndex });
  }
  return indicators;
}

function extractLines(content, indicators) {
  const lines = content.split("\n");
  let extractedLinesByIndicator = {};
  indicators.forEach(({ indicatorName, startIndex, endIndex }) => {
    extractedLinesByIndicator[indicatorName] = lines.slice(
      startIndex + 2,
      endIndex
    );
  });
  return extractedLinesByIndicator;
}

function extractIndicatorTimes(
  extractedLinesByIndicator,
  extractedRows,
  extractedColumns
) {
  let indicatorTimes = {};
  let analysisData = {};
  for (let indicator in extractedLinesByIndicator) {
    const extractedLines = extractedLinesByIndicator[indicator];
    let times = [];
    let dataPoints = [];
    for (let i = 0; i < extractedLines.length; i++) {
      const lineElements = extractedLines[i].split("\t");
      times.push(parseFloat(lineElements[0].replace("\r", "")));
      for (let j = 1; j < lineElements.length; j++) {
        const dataPoint = parseFloat(lineElements[j].replace("\r", ""));
        if (!isNaN(dataPoint)) {
          dataPoints.push(dataPoint);
        }
      }
    }
    indicatorTimes[indicator] = times;
    analysisData[indicator] = dataPoints;
  }
  return { indicatorTimes, analysisData };
}

function extractAllData(content) {
  let extractedRows = extractNumberOfRows(content);
  let rowLabels = generateRowLabels(extractedRows);
  let extractedColumns = extractNumberOfColumns(content);
  let extractedProjectTitle = extractProjectTitle(content);
  let extractedProjectDate = extractProjectDate(content);
  let extractedProjectTime = extractProjectTime(content);
  let extractedProjectInstrument = extractInstrument(content);
  let extractedProjectProtocol = extractProjectProtocol(content);
  let extractedAssayPlateBarcode = extractAssayPlateBarcode(content);
  let extractedAddPlateBarcode = extractAddPlateBarcode(content);
  let extractedBinning = extractBinning(content);
  let extractedIndicatorConfigurations =
    extractIndicatorConfigurations(content);
  let extractedOperator = extractOperator(content);
  let extractedIndicators = getIndicators(content);
  let extractedLines = extractLines(content, extractedIndicators);
  let { indicatorTimes: extractedIndicatorTimes, analysisData } =
    extractIndicatorTimes(extractedLines, extractedRows, extractedColumns);
  return {
    extractedIndicators,
    extractedLines,
    extractedRows,
    rowLabels,
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

// Use 'self' for web worker global context (ESLint may warn, but this is correct for workers)
// eslint-disable-next-line no-restricted-globals
self.onmessage = function (e) {
  const { content } = e.data;
  const result = extractAllData(content);
  // eslint-disable-next-line no-restricted-globals
  self.postMessage(result);
};

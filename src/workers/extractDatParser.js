// Pure streaming DAT parser. No Web Worker globals, no DOM, no React.
// Importable from the worker, from Jest tests, and from any other Node
// environment. Tests live in __tests__ alongside the existing filterCore
// tests.
//
// Usage:
//   const p = new DatParser();
//   p.feed(textChunk);    // call as many times as you have chunks
//   ...
//   const result = p.finalize();
//
// Output `result.analysisData[name]` and `result.extractedIndicatorTimes[name]`
// are `Float64Array`s — the worker shell transfers their backing buffers.

const CHUNK_FLOATS = 65536; // 512KB per chunk
const NL = 10; // '\n'
const CR = 13; // '\r'

// ---- header metadata extractors (operate on the buffered header text) ----

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

function findFirstLineWith(lines, needle) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(needle) !== -1) return i;
  }
  return -1;
}

function extractFieldByName(lines, needle) {
  const idx = findFirstLineWith(lines, needle);
  if (idx === -1) return "";
  const parts = lines[idx].split("\t");
  return parts.length > 1 ? parts[1].trim() : "";
}

function extractIndicatorConfigurationsFromLines(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf("Indicator") === -1) continue;
    const parts = line.split("\t");
    if (parts.length >= 9) {
      out.push({
        name: parts[1].trim(),
        Excitation: parts[3].trim(),
        Emission: parts[5].trim(),
        Exposure: parts[7].trim(),
        Gain: parts[9].trim(),
      });
    }
  }
  return out;
}

function extractOperatorFromLines(lines) {
  const startIndex = findFirstLineWith(lines, "NumCols");
  const endIndex = findFirstLineWith(lines, "Project");
  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) return [];
  const operatorLine = lines[startIndex + 1];
  if (!operatorLine) return [];
  return operatorLine
    .split("\t")
    .slice(1)
    .map((part) => part.trim());
}

function extractIntFieldByName(lines, needle) {
  const idx = findFirstLineWith(lines, needle);
  if (idx === -1) return 0;
  const parsed = parseInt(lines[idx].replace(/[^\d]/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ---- data-row tokenization helpers --------------------------------------

// Strips a trailing \r (CRLF tolerance) from a line read out of the chunk
// buffer. We do this before tab-splitting so trailing \r doesn't end up
// inside the last field.
function stripCR(line) {
  if (line.length === 0) return line;
  return line.charCodeAt(line.length - 1) === CR
    ? line.substring(0, line.length - 1)
    : line;
}

// ---- the parser --------------------------------------------------------

class DatParser {
  constructor() {
    this.state = "IN_HEADER";
    this.tail = "";
    // Header buffer — only the first ~few hundred lines, well below 1MB.
    this.headerLines = [];
    // Completed indicator blocks.
    this.completed = [];
    this.current = null;
  }

  feed(text) {
    if (!text) return;
    const combined = this.tail + text;
    let lineStart = 0;
    for (let i = 0; i < combined.length; i++) {
      if (combined.charCodeAt(i) === NL) {
        this.processLine(stripCR(combined.substring(lineStart, i)));
        lineStart = i + 1;
      }
    }
    this.tail = combined.substring(lineStart);
  }

  finalize() {
    if (this.tail.length > 0) {
      this.processLine(stripCR(this.tail));
      this.tail = "";
    }
    if (this.current) this.closeIndicator();
    return this.buildResult();
  }

  processLine(line) {
    switch (this.state) {
      case "IN_HEADER":
        if (line.indexOf("<INDICATOR_DATA") === 0) {
          const name = parseIndicatorName(line);
          this.openIndicator(name);
          this.state = "EXPECTING_INDICATOR_HEADER";
        } else {
          this.headerLines.push(line);
        }
        return;
      case "EXPECTING_INDICATOR_HEADER": {
        // Parse 'Time\tA1\t...\twN' to discover well count.
        const cols = line.split("\t");
        this.current.wellCount = cols.length - 1;
        this.state = "IN_INDICATOR_DATA";
        return;
      }
      case "IN_INDICATOR_DATA":
        if (line.indexOf("</INDICATOR_DATA>") === 0) {
          this.closeIndicator();
          this.state = "BETWEEN_BLOCKS";
        } else if (line.length > 0) {
          this.parseDataRow(line);
        }
        return;
      case "BETWEEN_BLOCKS":
        if (line.indexOf("<INDICATOR_DATA") === 0) {
          const name = parseIndicatorName(line);
          this.openIndicator(name);
          this.state = "EXPECTING_INDICATOR_HEADER";
        }
        return;
      default:
        return;
    }
  }

  openIndicator(name) {
    this.current = {
      name,
      wellCount: 0,
      rowCount: 0,
      chunks: [],
      currentChunk: null,
      chunkPos: 0,
      times: [],
    };
  }

  parseDataRow(line) {
    const ind = this.current;
    if (!ind || ind.wellCount === 0) return;
    // Fast tab-tokenize. Hand-rolled is faster than .split for the inner
    // loop, but .split is good enough at this scale and clearer.
    const cols = line.split("\t");
    if (cols.length === 0) return;
    const t = +cols[0];
    if (Number.isNaN(t)) return;
    ind.times.push(t);
    if (!ind.currentChunk) {
      ind.currentChunk = new Float64Array(CHUNK_FLOATS);
      ind.chunkPos = 0;
    }
    const wellCount = ind.wellCount;
    for (let j = 1; j <= wellCount && j < cols.length; j++) {
      if (ind.chunkPos >= ind.currentChunk.length) {
        ind.chunks.push(ind.currentChunk);
        ind.currentChunk = new Float64Array(CHUNK_FLOATS);
        ind.chunkPos = 0;
      }
      const v = +cols[j];
      ind.currentChunk[ind.chunkPos++] = Number.isNaN(v) ? 0 : v;
    }
    // If the row had fewer columns than wellCount (malformed), pad with 0s
    // to keep the row-major layout consistent.
    for (let j = cols.length; j <= wellCount; j++) {
      if (ind.chunkPos >= ind.currentChunk.length) {
        ind.chunks.push(ind.currentChunk);
        ind.currentChunk = new Float64Array(CHUNK_FLOATS);
        ind.chunkPos = 0;
      }
      ind.currentChunk[ind.chunkPos++] = 0;
    }
    ind.rowCount++;
  }

  closeIndicator() {
    const ind = this.current;
    if (!ind) return;
    if (ind.currentChunk && ind.chunkPos > 0) {
      ind.chunks.push(ind.currentChunk.subarray(0, ind.chunkPos));
    }
    let total = 0;
    for (let i = 0; i < ind.chunks.length; i++) total += ind.chunks[i].length;
    const flat = new Float64Array(total);
    let offset = 0;
    for (let i = 0; i < ind.chunks.length; i++) {
      flat.set(ind.chunks[i], offset);
      offset += ind.chunks[i].length;
    }
    const timesArr = new Float64Array(ind.times.length);
    for (let i = 0; i < ind.times.length; i++) timesArr[i] = ind.times[i];
    this.completed.push({
      name: ind.name,
      flat,
      times: timesArr,
      rowCount: ind.rowCount,
      wellCount: ind.wellCount,
    });
    this.current = null;
  }

  buildResult() {
    const headerLines = this.headerLines;

    const analysisData = {};
    const extractedIndicatorTimes = {};
    const extractedIndicators = [];
    for (let i = 0; i < this.completed.length; i++) {
      const ind = this.completed[i];
      analysisData[ind.name] = ind.flat;
      extractedIndicatorTimes[ind.name] = ind.times;
      extractedIndicators.push({
        id: i,
        indicatorName: ind.name,
        // startIndex/endIndex were line indices into the original split('\n')
        // representation. The streaming parser doesn't materialize that, so
        // these values are no longer meaningful — left as -1 for shape
        // compatibility with any straggler consumer.
        startIndex: -1,
        endIndex: -1,
      });
    }

    const extractedRows = extractIntFieldByName(headerLines, "NumRows");
    const extractedColumns = extractIntFieldByName(headerLines, "NumCols");

    return {
      extractedIndicators,
      // extractedLines was the raw per-indicator string array. With streaming
      // we never materialize it; consumers outside the parser don't read it.
      extractedLines: {},
      extractedRows,
      rowLabels: generateRowLabels(extractedRows),
      extractedColumns,
      extractedProjectTitle: extractFieldByName(headerLines, "Project"),
      extractedProjectDate: extractFieldByName(headerLines, "Date"),
      extractedProjectTime: extractFieldByName(headerLines, "Time"),
      extractedProjectInstrument: extractFieldByName(headerLines, "Instrument"),
      extractedProjectProtocol: extractFieldByName(headerLines, "ProtocolName"),
      extractedAssayPlateBarcode: extractFieldByName(
        headerLines,
        "AssayPlateBarcode"
      ),
      extractedAddPlateBarcode: extractFieldByName(headerLines, "AddPlateBarcode"),
      extractedBinning: extractFieldByName(headerLines, "Binning"),
      extractedIndicatorConfigurations:
        extractIndicatorConfigurationsFromLines(headerLines),
      extractedOperator: extractOperatorFromLines(headerLines),
      extractedIndicatorTimes,
      analysisData,
    };
  }
}

function parseIndicatorName(line) {
  // Lines look like '<INDICATOR_DATA\tBlue\t>' — possibly with extra
  // whitespace. Take the second tab-separated token.
  const parts = line.split("\t");
  return parts[1] ? parts[1].trim() : "unknown";
}

// Convenience for callers with the whole file already in memory (used by the
// worker's legacy `{content}` path and by tests).
function parseDatString(content) {
  const p = new DatParser();
  p.feed(content);
  return p.finalize();
}

// Collect transferable ArrayBuffers from a parser result for postMessage.
function collectExtractTransfers(result) {
  const transfers = [];
  if (result && result.analysisData) {
    for (const k in result.analysisData) {
      const arr = result.analysisData[k];
      if (arr && arr.buffer) transfers.push(arr.buffer);
    }
  }
  if (result && result.extractedIndicatorTimes) {
    for (const k in result.extractedIndicatorTimes) {
      const arr = result.extractedIndicatorTimes[k];
      if (arr && arr.buffer) transfers.push(arr.buffer);
    }
  }
  return transfers;
}

const _exports = {
  DatParser,
  parseDatString,
  collectExtractTransfers,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = _exports;
}

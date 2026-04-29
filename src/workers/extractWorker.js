/* eslint-disable no-restricted-globals */

// Web Worker shell for DAT parsing. The actual parser is the pure module in
// extractDatParser.js — this file just adapts the worker message protocol
// to the parser API and handles file streaming.
//
// Message in (preferred):  { file: File }    — streams via file.stream()
// Message in (legacy):     { content: string } — parses an in-memory string
// Message out:             the parser result, with all Float64Array buffers
//                          listed in postMessage's transfer list.

const {
  DatParser,
  parseDatString,
  collectExtractTransfers,
} = require("./extractDatParser.js");

self.onmessage = async function (e) {
  const data = e.data || {};
  try {
    let result;
    if (data.file && typeof data.file.stream === "function") {
      result = await parseFromBlob(data.file);
    } else if (typeof data.content === "string") {
      // Legacy path. Caller already paid the cost of materializing the full
      // UTF-16 string on the main thread; we just parse it in one shot.
      result = parseDatString(data.content);
    } else {
      throw new Error(
        "extractWorker: postMessage must include either {file} or {content}"
      );
    }
    const transfers = collectExtractTransfers(result);
    self.postMessage(result, transfers);
  } catch (err) {
    self.postMessage({
      __error: true,
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : null,
    });
  }
};

async function parseFromBlob(blob) {
  const reader = blob.stream().getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const parser = new DatParser();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      const tail = decoder.decode();
      if (tail) parser.feed(tail);
      break;
    }
    parser.feed(decoder.decode(value, { stream: true }));
  }
  return parser.finalize();
}

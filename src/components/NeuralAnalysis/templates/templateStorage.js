// localStorage-backed store for Neural Analysis templates.
//
// On-disk shape:
//   { schemaVersion: 1, templates: [ { name, createdAt, settings } ] }
//
// `settings` mirrors the persistable subset of NeuralSettingsContext —
// see PERSISTABLE_KEYS. ROI list, selected well, and control well are
// intentionally excluded: templates describe *how* to analyze, not
// *what* to analyze.

const STORAGE_KEY = "waveexplorer.neural.templates";
export const CURRENT_SCHEMA_VERSION = 1;
const MAX_TEMPLATES = 50;

export const PERSISTABLE_KEYS = [
  // spike detection
  "spikeProminence",
  "spikeWindow",
  "spikeMinDistance",
  "stdMultiplier",
  "noiseFloorMultiplier",
  "spikeMinWidth",
  "spikeMinProminenceRatio",
  "noiseWindowSize",
  // thresholds
  "activityThresholdRatio",
  "activityThresholdEnabled",
  "baselineThresholdOffset",
  "baselineThresholdEnabled",
  // noise / smoothing
  "smoothingEnabled",
  "smoothingWindow",
  "subtractControl",
  "baselineCorrection",
  "trendFlatteningEnabled",
  "trendFlatteningWindow",
  "trendFlatteningMinimums",
  // normalization
  "neuralNormalizationEnabled",
  "neuralRescaleByMedianFo",
  "foWindowEnabled",
  "foWindowStartRatio",
  "foWindowEndRatio",
  // control-well scaling (the toggle; the control WELL SET is stored
  // separately as positional keys — see TemplateMenu)
  "controlScalingEnabled",
  // decimation
  "decimationEnabled",
  "decimationSamples",
  // outlier handling
  "handleOutliers",
  "outlierSensitivity",
  "showRemovedOutliers",
  // burst
  "showBursts",
  "maxInterSpikeInterval",
  "minSpikesPerBurst",
  // legacy spike-display
  "useAdjustedBases",
  "findPeaksWindowWidth",
  "peakProminence",
];

const readStore = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schemaVersion: CURRENT_SCHEMA_VERSION, templates: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.templates)) {
      return { schemaVersion: CURRENT_SCHEMA_VERSION, templates: [] };
    }
    return parsed;
  } catch (_e) {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, templates: [] };
  }
};

const writeStore = (store) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (_e) {
    // Quota or disabled storage — swallow; caller's UI stays responsive.
  }
};

// Strip unknown keys so a future schema bump can't accidentally
// reintroduce dropped knobs from an older template.
const sanitizeSettings = (settings) => {
  if (!settings || typeof settings !== "object") return {};
  const out = {};
  for (const k of PERSISTABLE_KEYS) {
    if (k in settings) out[k] = settings[k];
  }
  return out;
};

// Control-well-scaling well set, stored as positional keys (e.g. "A1") so
// the same plate positions can be re-selected on a different file with the
// same layout. Kept as a top-level template field (NOT in `settings`,
// since it's a selection, not a knob — and sanitizeSettings would strip it).
const sanitizeControlWellKeys = (keys) =>
  Array.isArray(keys) ? keys.filter((k) => typeof k === "string") : [];

export const listTemplates = () => {
  const store = readStore();
  return [...store.templates].sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );
};

export const getTemplate = (name) => {
  const store = readStore();
  return store.templates.find((t) => t.name === name) || null;
};

export const saveTemplate = (name, settings, controlWellKeys = []) => {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new Error("Template name cannot be empty");
  }
  const store = readStore();
  const sanitized = sanitizeSettings(settings);
  const existingIdx = store.templates.findIndex((t) => t.name === trimmed);
  const entry = {
    name: trimmed,
    createdAt: new Date().toISOString(),
    settings: sanitized,
    controlWellKeys: sanitizeControlWellKeys(controlWellKeys),
  };
  if (existingIdx >= 0) {
    store.templates[existingIdx] = entry;
  } else {
    if (store.templates.length >= MAX_TEMPLATES) {
      throw new Error(
        `Template limit reached (${MAX_TEMPLATES}). Delete an existing template first.`
      );
    }
    store.templates.push(entry);
  }
  store.schemaVersion = CURRENT_SCHEMA_VERSION;
  writeStore(store);
  return entry;
};

export const deleteTemplate = (name) => {
  const store = readStore();
  const next = store.templates.filter((t) => t.name !== name);
  if (next.length === store.templates.length) return false;
  store.templates = next;
  store.schemaVersion = CURRENT_SCHEMA_VERSION;
  writeStore(store);
  return true;
};

export const templateExists = (name) => getTemplate((name || "").trim()) !== null;

// ---- Disk export / import -----------------------------------------------
//
// File-based templates use the same on-disk shape as the localStorage
// entries — a single self-contained object with `name`, `createdAt`,
// `schemaVersion`, and `settings`. That way a file produced by Export
// can be applied directly via applySettingsSnapshot(file.settings) or
// re-saved into the browser store via saveTemplate(file.name,
// file.settings) without any conversion.

// Replace OS-invalid filename characters with `_`, collapse runs of
// whitespace into single dashes. Keep the result printable.
const sanitizeFilename = (name) =>
  (name || "template")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "-")
    .trim() || "template";

export const buildTemplatePayload = (name, settings, controlWellKeys = []) => ({
  name: (name || "").trim(),
  createdAt: new Date().toISOString(),
  schemaVersion: CURRENT_SCHEMA_VERSION,
  settings: sanitizeSettings(settings),
  controlWellKeys: sanitizeControlWellKeys(controlWellKeys),
});

export const downloadTemplateFile = (template) => {
  if (!template || !template.settings) {
    throw new Error("Template has no settings to export");
  }
  const json = JSON.stringify(template, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(template.name)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

// Reads a file picked via <input type="file">. Returns a template
// object in the same shape as `buildTemplatePayload`. Unknown keys in
// `settings` are stripped via `sanitizeSettings`; missing top-level
// fields are filled with sensible defaults (filename → name, now →
// createdAt) so older or hand-edited files still load.
export const importTemplateFromFile = async (file) => {
  if (!file) throw new Error("No file provided");
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_e) {
    throw new Error("Invalid template file: not valid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid template file: not a JSON object");
  }
  if (!parsed.settings || typeof parsed.settings !== "object") {
    throw new Error("Invalid template file: missing 'settings' object");
  }
  const fallbackName = (file.name || "").replace(/\.json$/i, "") || "imported";
  return {
    name: typeof parsed.name === "string" && parsed.name.trim()
      ? parsed.name.trim()
      : fallbackName,
    createdAt:
      typeof parsed.createdAt === "string"
        ? parsed.createdAt
        : new Date().toISOString(),
    schemaVersion:
      typeof parsed.schemaVersion === "number"
        ? parsed.schemaVersion
        : CURRENT_SCHEMA_VERSION,
    settings: sanitizeSettings(parsed.settings),
    controlWellKeys: sanitizeControlWellKeys(parsed.controlWellKeys),
  };
};

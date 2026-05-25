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
  "baselineThresholdRatio",
  "baselineThresholdEnabled",
  // noise / smoothing
  "smoothingEnabled",
  "smoothingWindow",
  "subtractControl",
  "baselineCorrection",
  "trendFlatteningEnabled",
  "trendFlatteningWindow",
  "trendFlatteningMinimums",
  // decimation
  "decimationEnabled",
  "decimationSamples",
  // outlier
  "handleOutliers",
  "outlierPercentile",
  "outlierMultiplier",
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

export const saveTemplate = (name, settings) => {
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

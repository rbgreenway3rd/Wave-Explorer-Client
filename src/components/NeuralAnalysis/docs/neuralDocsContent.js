// Interactive Documentation content for the Neural Analysis modal.
//
// Plain-language explanations of every pipeline step and control, for
// users who are not fluent in math/data analytics. This file is the
// single source of content for NeuralDocsModal; control panels deep-link
// into it by section `id` (e.g. a [?] next to the Prominence slider opens
// the modal at "param-prominence").
//
// Authoring rules:
//   - Layman terms first. Define jargon in the Glossary group, not inline.
//   - Each section may set any of: what / why / analogy / ifWrong.
//     The modal renders whichever are present, each under a small label.
//   - Keep ids STABLE — controls reference them. Use the `param-*`,
//     `step-*`, `glossary-*` prefixes.
//   - `status: "planned"` marks content for features not yet shipped
//     (e.g. ΔF/F₀ normalization); the modal shows a "Planned" badge.
//
// The technical source of truth for control behavior is
// docs/neural-controls-reference.md — keep the two in sync (that file
// is precise/technical; this one is the plain-language layer). Wording
// here should be reviewed by the domain expert for scientific accuracy.

export const DOC_GROUPS = [
  { id: "overview", title: "Start here" },
  { id: "pipeline", title: "How the analysis works, step by step" },
  { id: "parameters", title: "What each control does" },
  { id: "glossary", title: "Glossary" },
];

export const DOC_SECTIONS = [
  // ---- Overview ---------------------------------------------------------
  {
    id: "overview-intro",
    group: "overview",
    title: "What this tool does",
    what: "It looks at the brightness trace from each well over time and automatically finds the spikes — the moments when the cells fired and the signal jumped up. It then measures those spikes (how tall, how wide, how often) so you can compare wells.",
    why: "Doing this by eye across a whole plate is slow and inconsistent. The tool applies the same rules to every well so the numbers are comparable.",
    analogy: "Think of it as a heart-rate monitor for cells: it cleans up a noisy trace, marks each beat, and tallies them.",
  },
  {
    id: "overview-pipeline",
    group: "overview",
    title: "The big picture: clean up, then count",
    what: "Every well goes through the same two-part process. First the signal is cleaned up (drift removed, noise smoothed). Then the spikes are found and measured. The controls in this panel let you tune both parts.",
    analogy: "Like tidying a messy handwritten page before counting the words: first make it legible, then count.",
  },

  // ---- Pipeline (in processing order) -----------------------------------
  {
    id: "step-noise-suppression",
    group: "pipeline",
    title: "1. Noise suppression",
    what: "Optionally subtracts a 'control' well's trace from the others to cancel out shared background — flickers in the light source or plate-wide artifacts that aren't real cell activity.",
    why: "If every well shares the same background wobble, removing it makes the real spikes stand out.",
    analogy: "Like noise-cancelling headphones removing the constant hum so you can hear the music.",
    ifWrong: "Subtracting the wrong control can erase real signal or add noise instead of removing it.",
  },
  {
    id: "step-detrend",
    group: "pipeline",
    title: "2. Detrending (removing slow drift)",
    what: "Removes slow, gradual changes in the baseline — the gentle upward or downward slope a trace can have over time — so only the fast spikes remain.",
    why: "Dyes fade and baselines drift. Without removing that drift, the slope can hide spikes or fool the spike-finder.",
    analogy: "Like flattening a curled photo so you can see what's printed on it, not the curl.",
    ifWrong: "Too aggressive and it can flatten real broad events; too gentle and slow drift remains and confuses detection.",
  },
  {
    id: "step-baseline",
    group: "pipeline",
    title: "3. Baseline correction",
    what: "Pins the resting level of the trace down to a consistent zero, by tracking the low points of the signal.",
    why: "Gives every spike a common reference to be measured from, so heights are comparable.",
    analogy: "Like setting a scale to zero before weighing something.",
  },
  {
    id: "step-normalization",
    group: "pipeline",
    title: "4. F/Fo normalization",
    what: "An opt-in toggle (in the F/Fo Normalization panel, off by default). When on, it expresses each well's signal as a fold-change over its own resting brightness, so a bright well and a dim well can be compared fairly. Runs right after detrending — before outlier handling and smoothing — so everything downstream, including spike detection, works on the normalized trace. A second toggle rescales those fold-changes by the plate's median resting brightness so the numbers land in an easy-to-read range (on by default).",
    why: "Wells start at different brightness. Dividing by each well's resting level puts them all on the same footing for well-to-well comparison of peak height and area.",
    analogy: "Like grading on a percentage instead of raw points, so tests of different total marks can be compared.",
    ifWrong: "If the resting brightness can't be measured for a well (e.g. an empty well), that well is skipped and reported rather than producing a bad number.",
  },
  {
    id: "step-outliers",
    group: "pipeline",
    title: "5. Outlier handling",
    what: "Finds unusually tall, sharp blips and marks them, so the smoothing step in between doesn't accidentally shrink your biggest real peaks.",
    why: "Smoothing averages neighboring points; without protection it would flatten genuine tall spikes.",
    analogy: "Like flagging the tallest mountains on a map before you blur it, so they stay visible.",
  },
  {
    id: "step-smoothing",
    group: "pipeline",
    title: "6. Smoothing",
    what: "Gently averages out the fine, jittery noise in the trace while keeping the overall shape of the spikes.",
    why: "A jagged trace produces false little peaks. Smoothing makes the real peaks easier to find reliably.",
    analogy: "Like running a finger along a rough line to even it out without changing where the bumps are.",
    ifWrong: "Too much smoothing merges close spikes together or lowers their height; too little leaves noise that gets miscounted.",
  },
  {
    id: "step-spike-detection",
    group: "pipeline",
    title: "7. Spike detection",
    what: "Scans the cleaned trace and marks each spike, then measures it: height, width, area, and how often spikes occur. The sliders under 'Spike Detection' control exactly what counts as a spike.",
    why: "This is the core result — the peaks and their measurements feed every metric and report.",
    analogy: "Like a metronome app tapping out each beat it hears, then telling you the tempo.",
  },
  {
    id: "step-thresholds",
    group: "pipeline",
    title: "8. Activity & baseline thresholds",
    what: "Two reference lines on the graph. The activity line is a floor — only peaks whose top rises above it are kept, so it sets what counts as a real spike. The baseline line sets the level each kept peak's width and area (AUC) are measured down to.",
    why: "The activity line gives a visible, adjustable cutoff so borderline bumps are handled consistently; the baseline line gives every peak a common reference for width and area, so those measurements compare fairly across wells.",
    analogy: "The activity line is like a height bar at a fairground ride — only bumps that clear it count. The baseline line is the floor those bumps are measured up from.",
  },
  {
    id: "step-bursts",
    group: "pipeline",
    title: "9. Burst detection",
    what: "Groups spikes that happen close together in time into 'bursts', and reports burst-level measurements.",
    why: "Cells often fire in clustered bursts; measuring the clusters can be more meaningful than individual spikes.",
    analogy: "Like grouping rapid knocks on a door into 'one set of knocking' rather than counting each tap.",
  },
  {
    id: "step-control-scaling",
    group: "pipeline",
    title: "10. Control-well scaling",
    what: "Optionally re-expresses every peak's reported height / area as a percentage of your untreated 'control' wells, so the control median reads 100 and everything else is a percentage of it. The graph keeps its detection units — only the reported measurements are scaled — so the y-axis stays put while you tune. Applied after spikes are found, so it never changes what counts as a spike.",
    why: "Makes treated-vs-control comparisons immediately intuitive (e.g. '140% of control').",
    analogy: "Like setting your control group to 100% and reading everything else relative to it.",
  },

  // ---- Parameters -------------------------------------------------------
  {
    id: "param-prominence",
    group: "parameters",
    title: "Prominence",
    what: "How much a bump must stand out from the dips on either side of it to count as a real spike.",
    why: "It's the main 'sensitivity' control. Higher = only clear, tall spikes; lower = also catches smaller ones (and more noise).",
    ifWrong: "Set too high and real spikes are missed; too low and noise gets counted as spikes.",
  },
  {
    id: "param-window",
    group: "parameters",
    title: "Window width",
    what: "How wide a neighborhood the detector looks across when deciding whether a point is a local peak.",
    why: "Wider windows ignore tiny wiggles and find broader peaks; narrower windows pick up closely-spaced spikes.",
  },
  {
    id: "param-min-distance",
    group: "parameters",
    title: "Minimum distance",
    what: "The closest two spikes are allowed to be. Bumps nearer than this are treated as one spike.",
    why: "Prevents a single spike with a jagged top from being counted twice.",
  },
  {
    id: "param-min-width",
    group: "parameters",
    title: "Minimum width",
    what: "The narrowest a bump can be and still count as a spike.",
    why: "Filters out single-point noise blips that are too thin to be real events.",
  },
  {
    id: "param-noise-floor",
    group: "parameters",
    title: "Noise floor (× σ)",
    what: "A cutoff set as a multiple of the trace's own noise level — only bumps that rise this far above the noise count.",
    why: "Automatically adapts the sensitivity to how noisy each individual well is.",
  },
  {
    id: "param-activity-threshold",
    group: "parameters",
    title: "Activity threshold",
    what: "A floor line. Only peaks whose apex rises above it are kept; lower bumps are dropped before metrics and bursts.",
    why: "Gives a consistent, visible cutoff for what counts as a real spike, instead of an eyeball judgment.",
  },
  {
    id: "param-baseline-threshold",
    group: "parameters",
    title: "Baseline threshold",
    what: "A reference line that sets the level each peak's width and area (AUC) are measured down to.",
    why: "Gives every peak a common base for its width and area so those numbers compare across wells — separate from the prominence rule that decides what counts.",
  },
  {
    id: "param-smoothing-window",
    group: "parameters",
    title: "Smoothing window",
    what: "How many neighboring points are averaged together when smoothing the trace.",
    why: "Bigger = smoother but can blur close spikes; smaller = preserves detail but leaves more noise.",
  },
  {
    id: "param-trend-window",
    group: "parameters",
    title: "Trend window",
    what: "How far the detrending step looks when estimating the slow drift to remove.",
    why: "Larger windows remove only very slow drift; smaller windows remove faster wobbles too.",
  },
  {
    id: "param-outlier-percentile",
    group: "parameters",
    title: "Outlier percentile",
    what: "How extreme a bump has to be (relative to the rest) before it's flagged as an outlier to protect during smoothing.",
  },
  {
    id: "param-fo-window",
    group: "parameters",
    title: "Baseline (Fo) window",
    what: "A shaded, draggable band on the chart marking the stretch of time each well's resting brightness (Fo) is measured over. Drag its edges to cover a quiet, pre-activity period (e.g. before the addition). Fo becomes the median of the raw signal inside the band. The same window (as a fraction of the trace) applies to every well. Only shown when F/Fo normalization is on. A toggle turns the window off to revert to measuring Fo over the whole trace (the original behavior).",
    why: "Measured over a quiet window, Fo reflects the true resting level. If you instead average the whole trace, an active well's own spikes drag Fo upward and shrink its ΔF/F₀ — so the window is what keeps wells comparable.",
    ifWrong: "Place the band over active (post-stimulus) signal and Fo is too high, compressing that well's peaks. A window with no measurable resting brightness skips the well (left in native units).",
  },
  {
    id: "param-rescale-median-fo",
    group: "parameters",
    title: "Rescale by plate-median Fo",
    what: "After computing F/Fo (a small fold-change number), multiplies it by the plate's median resting brightness so values land in an easier-to-read range.",
    why: "Turns tiny fold-change numbers into magnitudes that are easier to make sense of, while staying comparable across wells.",
  },
  {
    id: "param-control-set",
    group: "parameters",
    title: "Control wells (for scaling)",
    what: "The set of untreated wells whose median peak height becomes the 100% reference for control-well scaling.",
    why: "Different experiments have different controls, so you choose them per run.",
  },
  {
    id: "param-burst-isi",
    group: "parameters",
    title: "Max inter-spike interval",
    what: "The longest gap allowed between spikes for them to still belong to the same burst.",
  },
  {
    id: "param-burst-min-spikes",
    group: "parameters",
    title: "Min spikes per burst",
    what: "The fewest spikes a cluster must contain to be called a burst.",
  },
  {
    id: "param-decimation",
    group: "parameters",
    title: "Data decimation",
    what: "Draws the graph using fewer points for speed. Affects only the display, not the underlying measurements.",
  },

  // ---- Glossary ---------------------------------------------------------
  {
    id: "glossary-fo",
    group: "glossary",
    title: "Fo (resting brightness)",
    what: "A well's baseline fluorescence — how bright it is at rest, before any activity. Used as the reference for F/Fo normalization.",
  },
  {
    id: "glossary-dff0",
    group: "glossary",
    title: "ΔF/Fo",
    what: "The change in brightness divided by the resting brightness — a fold-change. Lets bright and dim wells be compared on the same scale.",
  },
  {
    id: "glossary-auc",
    group: "glossary",
    title: "AUC (area under the curve)",
    what: "The area beneath a spike — a combined measure of how tall and how wide it is. A broad medium spike can have the same AUC as a tall narrow one.",
  },
  {
    id: "glossary-prominence",
    group: "glossary",
    title: "Prominence",
    what: "How much a peak stands out from the surrounding dips — not its absolute height, but its height above the valleys beside it.",
  },
  {
    id: "glossary-baseline",
    group: "glossary",
    title: "Baseline",
    what: "The resting level of the trace between spikes — the value the signal returns to when nothing is happening.",
  },
  {
    id: "glossary-median",
    group: "glossary",
    title: "Median",
    what: "The middle value when numbers are sorted. Unlike an average, a few extreme values (like empty wells) barely move it — which is why it's used here.",
  },
  {
    id: "glossary-sigma",
    group: "glossary",
    title: "σ (noise level)",
    what: "A measure of how much the trace jitters when nothing is happening. Thresholds set as '× σ' adapt automatically to each well's own noisiness.",
  },
];

// Convenience lookup by id (for deep-linking from controls).
export const DOC_SECTIONS_BY_ID = DOC_SECTIONS.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {});

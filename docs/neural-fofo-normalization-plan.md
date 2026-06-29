# Plan: Detrend-before-F/Fo normalization in the Neural module (+ Interactive Documentation modal)

Status: approved direction (Jun 2026), pending domain-expert sign-off on the normalization math (D1).
Branch context: `normalize`. Follows the Jun 12 plan "Neural Modal: Universal Parameters + Well-to-Well Normalization" (Phases 1–3 already shipped: global params, median-Fo Static Ratio option, control-well scaling).

---

## 1. What we're doing

Two tied-together pieces of work:

1. **Fix the F/Fo ordering for neural analysis.** Today the neural pipeline is fed the main page's already-filtered signal, so any Static Ratio (F/Fo) has happened *before* the neural pipeline detrends. The client requires the neural order to be **detrend → F/Fo → detect**. We make F/Fo a **neural-owned normalization step inside the pipeline**, applied after detrending, expressed as a scientifically explicit **ΔF/F₀** (see §3). The main WaveExplorer page's Static Ratio filter is left unchanged.

2. **Build an Interactive Documentation modal inside the neural modal** (§7) that explains each pipeline step and each parameter in layman's terms, in expandable sections — because some users are not fluent in math/data analytics. The new normalization step is authored into it as a first-class entry, so the feature ships with its own explanation.

## 2. Why

- **Client requirement (item, verbatim):** "for the neural module the detrending needs to be done first... 1) Detrend (neural module only)... 3) Perform F/Fo as normal." This is the one deferred item from the Jun 12 plan ("relocating F/Fo into the neural pipeline is a separate concern, out of scope here").
- **The current order degrades detection.** F/Fo divides raw by baseline Fo *before* drift removal; detrend then runs on the compressed ~0–2 ratio signal — the root of the "prominence must be set to 0.0##" problem. Detrend-then-F/Fo keeps detection on a sensible magnitude scale and makes peak height / AUC comparable well-to-well.

### Grounded trace (verified against code)

- Pipeline is self-contained: `runNeuralAnalysisPipeline` takes a `rawSignal` and internally runs noise-suppress → trendFlattening (detrend) → baseline → outliers → Savitzky-Golay smoothing → detect (NeuralPipeline.js:128-260).
- But the modal feeds that `rawSignal` parameter the **final filtered signal** (`materializeFilteredData()`, post-Static-Ratio) — NeuralResultsContext.jsx:215,229; same pattern in full-plate export NeuralFullPlateReport.js:436.
- The indicator persists only two states: `rawYs` (no filters) and `filteredYs` (all filters incl. F/Fo) — Models.js:73-87. The "everything except Static Ratio" intermediate is transient in the phase loop (CombinedComponent.js:201-253) and discarded.

Net: today is effectively **F/Fo → detrend → detect**; we want **detrend → F/Fo → detect**.

---

## 3. The normalization math (LOCKED: ΔF/F₀; D1 pending domain-expert nod)

**Do NOT reuse `applyStaticRatio` after `trendFlattening`.** `trendFlattening` does two subtractions — a linear-fit subtraction (neuralSmoothing.js:35-38) then a rolling-min-median baseline subtraction (neuralSmoothing.js:53-56) — leaving the signal centered at ~0 (golden test asserts mean≈0, trendFlattening.golden.test.js:26). Ordinary F/Fo on that divides by a near-zero/negative Fo. This is mathematically broken.

Instead implement standard **ΔF/F₀** in a new `neuralNormalization.js` utility:

- **F₀(well)** = robust resting fluorescence from the **raw** signal (median of `rawYs` over the Fo window; rolling-min-median if no window). Valid only if F₀ > 0 and the well has data, else **skip and record in metadata**.
- **ΔF(t)** = the `trendFlattening` output (already baseline-subtracted → deviation from the well's own resting level).
- **Normalized = ΔF(t) / F₀(well)** — dimensionless fold-change. Never divides by the near-zero detrended baseline because F₀ comes from raw.
- **Well-to-well restore (client item #1, D2):** `× median(F₀)` over valid wells → `ΔF/F₀ × medianF₀`, comparable across the plate at sensible magnitude. **Detection runs on this signal when rescale is on**; `medianF₀` is a plate-wide scalar so per-well detection independence is preserved.
- **Control-well scaling (item #2, already shipped, post-detection):** `× 100 / controlMedianPeak` on top. Control median is **median-of-per-well-medians** (what the code does today — locked, documented in CSV).

`neuralNormalization.js` returns metadata: `thisWellFo`, `plateMedianFo`, `skippedFoCount`, `unitMode ∈ {native, dFF0, dFF0_x_medianFo, pct_control}`.

This is standard calcium-imaging ΔF/F₀. The client wrote "F/Fo" but means this. **Run the exact definition past the domain expert before building (the client explicitly invited this — "ask your dad").**

---

## 4. Risk analysis

### 4a. Input-source problem (which filters are lost when neural reads raw)

Filter inventory (FilterModels.js) vs. what the neural pipeline already re-does internally:

| Chain filter | Re-done inside neural? | If neural reads raw instead of filteredYs |
|---|---|---|
| StaticRatio (F/Fo) | No — we're moving it in | Intended: drop, re-apply post-detrend as ΔF/F₀ |
| Smoothing | Yes (Savitzky-Golay) | Redundant; safe to drop |
| ControlSubtraction | Yes (`suppressNoise` + neural control-well) | **Not perfectly equivalent** — warn |
| OutlierRemoval | Yes (`identifyOutliers`/`handleOutliers`) | Redundant; safe to drop |
| FlatFieldCorrection | No | **Preserve** (per-well scalar) — Option A+ |
| Derivative | No | Lost, but nonsensical before spike detection — warn |
| DynamicRatio | No | Lost (alternative ratio method) — warn |

**Decision (D3, D5): Option A+.** Neural sources **raw typed arrays**, owns ΔF/F₀, and **preserves Flat-Field Correction** if active (it's just a per-well scalar). **Warn clearly** when Static Ratio, Dynamic Ratio, Derivative, or main Control Subtraction are active in the chain and therefore bypassed by neural normalization. Active filters are available via DataContext (DataProvider.js:549).

### 4b. The `noiseSuppressionActive` hidden gate

`trendFlattening`, `baselineCorrection`, outliers, and smoothing all sit under one `if (noiseSuppressionActive)` (NeuralPipeline.js:156). Inserting F/Fo there would silently turn off when that toggle is off. **Fix: neural normalization gets its own independent gate (`neuralNormalizationEnabled`) and the pipeline preprocessing order is made explicit with per-step gates; the ΔF source (`trendFlattening`) must be available to normalization regardless of the noise-suppression toggle.** This is a small refactor of the gate block, not a bare insertion.

### 4c. Memory in full-plate / report / prepass paths

The naive "source from `materializeRawData()`" caches full `{x,y}[]` arrays on every indicator (Models.js:155), recreating the OOM pattern this codebase fights (~770MB peaks). **Fix: a shared helper reads `rawXs/rawYs` and builds transient per-well points (or passes typed arrays straight to the pipeline/worker); never cache raw point arrays during full-plate report or control-scale prepasses.**

### 4d. Plate-median F₀ must be first-class, not an afterthought

Client asked to "bake in" well-to-well normalization. Compute median from **valid positive F₀ only**; skip dead/empty (zero-Fo) wells (otherwise they drag the median); track and expose `skippedFoCount` in UI + CSV. Cache keyed by dataset + indicator + Fo window + normalization mode + trend params + preserved flat-field factors.

### 4e. Full-plate auto-suggest would be wrong

Full-plate auto mode calls `suggestSpikeParameters(rawSignal)` before the pipeline (NeuralFullPlateReport.js:448). With normalization moved inside the pipeline, **auto-suggest must run on the normalized/preprocessed signal**, or suggested prominence is in the wrong units.

### 4f. Control-scaling display consistency (gap in the shipped feature)

Today the helper scales the displayed signal but leaves native detection metrics (controlScaling.js:129) while prominence/noise overlays stay unscaled (NeuralGraph.js:883); candidate diagnostics also appear unscaled. **Decision (D4): scale ALL display artifacts consistently** — signal, peaks, bases, candidate diagnostics, `noiseSigma`, prominence overlays, and labels.

### 4g. "Toggle off ≠ today byte-for-byte"

Once neural stops reading `filteredYs`, "off" would mean raw-input detection, not today's chain-filtered detection. **Decision (D3): make the source switch conditional** — normalization **on** → raw(+flat-field) source + ΔF/F₀; normalization **off** → preserve today's `filteredYs` path exactly (true escape hatch + real golden baseline).

---

## 5. Implementation steps

1. **`neuralNormalization.js`** — ΔF/F₀ with F₀ positivity validation, optional `×medianF₀`, metadata (`thisWellFo`, `plateMedianFo`, `skippedFoCount`, `unitMode`). No blind Static-Ratio reuse.
2. **Pipeline gate refactor + normalization step** — independent `neuralNormalizationEnabled` gate; explicit preprocessing order; F/Fo step after `trendFlattening`; ΔF source available regardless of the noise-suppression toggle.
3. **`getNeuralSourceSignal` shared helper** — raw typed arrays, transient points (no `materializeRawData` caching), preserve Flat-Field, expose `bypassedFilters` for the warning UI. Used by live modal, control-scale prepass, full-plate report, and auto-suggest.
4. **Plate-median F₀** — valid-positive-only median, skipped-well tracking, dataset-keyed cache.
5. **Auto-suggest** — run on the normalized/preprocessed signal.
6. **Control-scaling display consistency** — scale every display artifact (D4).
7. **Settings + reporting surface together** — `DEFAULT_SETTINGS`, `PERSISTABLE_KEYS`, `processingParams`, single-well CSV, full-plate CSV, templates, chart axis labels, `unitMode`.
8. **Conditional source switch** — preserve `filteredYs` path when normalization off (D3).

---

## 6. New UI / visual end result — F/Fo Normalization panel

New collapsible section "F/Fo Normalization" in AdvancedTweakablesCard `SECTIONS`, above Control-Well Scaling (visual order mirrors data order: normalize, then scale-to-control):

```
┌─ F/Fo Normalization ──────────────────────────┐
│  [✓] Apply F/Fo (detrend → F/Fo)        [?]    │  Switch, default ON; [?] opens docs at this section
│  Baseline (Fo) window                          │
│    start [  0 ]   end [ 50 ]   frames          │
│  [ ] Rescale by plate-median Fo                │  Switch (median-Fo restore)
│  Fo (this well): 1240  ·  median Fo: 1185      │  live readout
│  Skipped wells (no valid Fo): 3                │  from metadata
│  ⚠ Upstream Static Ratio / Flat-Field bypass…  │  warning row, only when relevant
└────────────────────────────────────────────────┘
```

**User-visible result:**
- ON (default): graph Y-axis relabels to "ΔF/F₀" (or "ΔF/F₀ × median Fo" when rescale is on); clean peaks on a sensible scale; default prominence usable without 0.0## values; peak-height/AUC comparable across wells.
- OFF: identical to today's behavior (escape hatch / A-B).
- Stacked with Control-Well Scaling: F/Fo normalizes magnitude, then control scaling re-expresses peaks as "% of control (control median = 100)". Axis, metric cards, and CSV header reflect whichever combination is on.

---

## 7. New UI — Interactive Documentation modal

**Goal.** A help layer openable from inside the neural modal that explains, in plain language, what happens to the data at each pipeline step and what every control does — for users who are not fluent in math/data analytics.

**Components.**
- `NeuralDocsModal.jsx` — the modal shell.
- `neuralDocsContent.js(x)` — structured content keyed by stable section/parameter ids (so controls can deep-link, and so content stays maintainable). Seeded from the existing technical reference `docs/neural-controls-reference.md`, rewritten to layman terms; the reference stays the technical source of truth and the two are kept in sync.

**Trigger / interactivity.**
- A "Help / Learn" button in the neural modal header opens the modal at the overview.
- Each control panel gets a small `[?]` icon that opens the modal **deep-linked and expanded at that control's section** (the "interactive" part — documentation reachable in-context from the thing it explains).
- Optionally, a section reflects the current parameter value with a one-line plain-language interpretation of what that value is doing right now.

**Layout.** An accordion of expandable/collapsible sections (matches "expandable sections for readability"), grouped:

- **Overview** — what the neural module does, in one short plain-language paragraph; the big picture of "clean up the signal, then find the peaks."
- **How the analysis works (the pipeline), step by step** — one expandable per stage, in pipeline order:
  1. Noise suppression (control subtraction)
  2. Detrending (trend flattening) — removing slow drift
  3. Baseline correction
  4. Outlier handling
  5. Smoothing (Savitzky-Golay)
  6. **ΔF/F₀ normalization (NEW)** — expressing each well as a fold-change over its resting brightness; optional ×median Fo; optional % of control
  7. Spike detection
  8. Activity & baseline thresholds
  9. Burst detection
  10. Control-well scaling
  Each entry: **What it does · Why it matters · An everyday analogy · What you'll see if it's set wrong.**
- **What each control does (parameters)** — grouped to mirror the control panels, every parameter from `DEFAULT_SETTINGS` explained plainly: prominence, window width, min distance, cluster separation, noise floor (×σ), min width, symmetry, noise window, activity/baseline thresholds, smoothing window, trend window/minimums, outlier percentile/multiplier, Fo window, rescale, control set, burst params, decimation.
- **Glossary** — Fo, ΔF/F₀, AUC, prominence, baseline, detrend, median, percentile, etc.

**Authoring constraint.** Plain language, define terms in the glossary, avoid equations in the body (link to glossary for the curious). Layman wording reviewed by the domain expert for scientific accuracy.

**Tie-in.** Building the doc modal alongside the normalization work is synergistic: as we add the ΔF/F₀ step we author its doc entry (what Fo means, detrend→F/Fo ordering, % of control, what gets bypassed) at the same time, so the feature ships explained.

---

## 8. Verification

- **Unit/golden:** `neuralNormalization` math (ΔF/F₀, F₀ validation, skip non-positive); pipeline runs F/Fo on the detrended array (not raw); plate-median F₀ (valid-positive only, multi-indicator independence, dead-well robustness); normalization OFF reproduces today's `filteredYs` path byte-for-byte.
- **Memory:** assert no full-plate `{x,y}[]` caching during report / control-scale prepass.
- **Display consistency:** every artifact (signal, peaks, bases, candidates, noiseSigma, overlays, labels) scales together under control-well scaling.
- **Docs modal:** every pipeline step and every `DEFAULT_SETTINGS` parameter has a content entry; control `[?]` deep-links resolve to the right section.
- **Manual:** load data, open modal — peaks detect at default prominence with F/Fo on; toggle off → native behavior; add Flat-Field upstream → preserved + no warning; add Static Ratio upstream → bypass warning; verify CSV numbers + header; control scaling reads ~100 for controls on top of F/Fo. Run the app per the project run skill end-to-end.

---

## 9. Locked decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Normalization math | ΔF/F₀ with F₀ from raw baseline (pending domain-expert nod) |
| D2 | Detection units when rescale on | detect on ΔF/F₀ × medianF₀ |
| D3 | Source switch | conditional (preserve `filteredYs` path when off) |
| D4 | Control-scaling display | scale all display artifacts |
| D5 | Fo window control | neural-owned input |
| D6 | Scope | plain ΔF/F₀ first, median-F₀ rescale as fast follow |
| + | Interactive Documentation modal | in scope, authored alongside the normalization step |

---

## 10. Build progress

- [x] **Interactive Documentation modal scaffold** — `src/components/NeuralAnalysis/docs/`: `NeuralDocsModal.jsx` (accordion + search + deep-link), `neuralDocsContent.js` (all 10 pipeline steps, ~19 params, glossary; ΔF/F₀ entries tagged `status:"planned"`), `NeuralDocsModal.css`. Header book-icon trigger wired in `NeuralAnalysisModal.js`.
- [x] **Per-control deep-links** — `NeuralDocsContext` + `DocsHelpButton`; a `[?]` on each control panel (mapped via `docId` in `AdvancedTweakablesCard.jsx`) opens the docs at the relevant section.
- [x] **Step 1: `neuralNormalization.js`** (`utilities/`) — ΔF/F₀ math (`computeFo`, `computePlateMedianFo`, `applyDeltaFOverFo`, `normalizeWell`) with F₀ validation + metadata + unit modes. 19 unit tests passing. **This module is the concrete artifact for the D1 domain-expert review** (the F₀ estimator + ΔF/F₀ choice are the reviewable knobs).
- [x] **Live-modal integration** (default OFF, behavior-preserving):
  - Settings: `neuralNormalizationEnabled` added to `DEFAULT_SETTINGS` + value/setter maps + value object + `PERSISTABLE_KEYS`.
  - Pipeline: gated ΔF/F₀ step in `runNeuralAnalysisPipeline` after `trendFlattening` (gated on `neuralNormalizationEnabled && trendFlatteningEnabled`); F₀ = median of the raw input (robust to sparse spikes; skips F₀≤0); returns `normalization` metadata. MVP uses whole-trace median F₀ — the baseline-window estimator is a fast-follow.
  - Source switch (D3): `NeuralResultsContext` feeds RAW when normalization on, else today's `filteredYs` path.
  - UI: `NormalizationPanel` (toggle + per-well F₀ readout + skip/needs-trend notes) registered in `AdvancedTweakablesCard` with a `[?]` → `step-normalization`.
  - Tests: 4-test pipeline integration (`normalizationPipeline.test.js`) — off-by-default native, ΔF/F₀ = detrended ÷ raw-F₀ pointwise, requires-trend, dead-well skip. trendFlattening golden still passes (default-off unchanged).
- [x] **Control-scaling axis bug fix (D4 resolved → option A).** Adjusting prominence with control scaling on made the y-axis lurch (and blow up at low prominence), because the displayed *signal* was scaled by `k`, and `k` is recomputed from the control wells' prominence-dependent detection. Fix: new `scaleReportedMetrics` scales only the reported amplitude/AUC numbers + aggregates (read by the metric cards via the `.amplitude`/`.auc` fields), leaving `processedSignal` + coordinates + prominences **native** — so the axis and markers stay put while tuning. `NeuralResultsContext` now uses it instead of `scalePipelineResults`. Also fixed control-well **sourcing**: `computeControlScaleFactor` + the control-signal now use RAW when normalization is on (matching the selected well), so `k` isn't computed in mismatched units. Tests: `scaleReportedMetrics` (scales numbers, leaves signal/coords native); full neural suite green (159 tests).
- [x] **Relative (scale-invariant) prominence — Option A.** Diagnosis: the reported "prominence jumps 1→1080 on F/Fo toggle" could NOT be reproduced as an auto-change (3 component tests + code review confirm nothing writes prominence but the slider/Reset). Root cause was *unit staleness* — prominence was absolute, so toggling normalization (~10,000× unit change) left it meaningless. Fix: `spikeProminence` is now a **fraction of the signal range (0–1)**, converted to absolute per-run inside the pipeline (gated on `params.spikeProminenceRelative` — default stays absolute for back-compat with direct callers/tests). Default 1 → **0.1**; slider shows a **percent** on a fixed track (removed the per-scale range animation — the prime suspect for the reported jump); overlay consumes a derived absolute `effectiveSpikeProminenceAbs`; live + report paths set the flag. **Verified on real data**: a fixed 0.1 fraction now yields *identical* peak counts in native vs ΔF/F₀ units (was 2900 vs 3). Full neural suite green (162 tests). **Back-compat:** saved templates with old absolute prominence values are reinterpreted as fractions (clamped to 1) — re-tune/re-save. Needs a browser eyeball for slider feel + overlay alignment.
- [x] **Control-median readout rounding** — `fmtPeak` shows decimals for < 1 values (ΔF/F₀ control medians ~0.14 no longer display as "0").
- [x] **Template persistence for the new controls.** `controlScalingEnabled` added to `PERSISTABLE_KEYS` (the toggle now saves; `neuralNormalizationEnabled` already was). The **control-well SET** is saved as positional keys ("A1") at the template top level (`controlWellKeys` — not in `settings`, which `sanitizeSettings` would strip) and re-resolved to wells in the loaded file on apply, so the setup reuses across files with the same plate layout; positions absent from a different layout are skipped, and a template without control wells leaves the current selection untouched (back-compat). Also surfaced control scaling in the results UI: a "% of control" banner + Amplitude/AUC card labels when active. Round-trip tests + full neural suite green (166 tests).
- [ ] Remaining (not started): baseline-window F₀ + rescale-by-median-F₀ (plate prepass), full-plate report/CSV + auto-suggest-on-normalized, control-scaling display consistency, `getNeuralSourceSignal` no-cache helper for the full-plate path, bypass-warning via DataContext active filters, templates/axis-label/unit surfacing.
- [ ] Per-parameter `[?]` deep-links inside Spike Detection sliders (panel-level done; param-level is an easy extension — ids already exist).

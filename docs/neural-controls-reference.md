# Neural Analysis controls reference

A per-slider description of the **Outlier Handling**, **Burst Detection**, and **Spike Detection** panels in the Neural Analysis modal. Each entry covers what the slider is supposed to do, what to look for on the graph as you change it, and any known wiring gaps to be aware of when something doesn't behave the way you expect.

---

## Orientation

### Data flow

```
Slider (Controls component)
  → useNeuralSettings (NeuralSettingsContext)
  → NeuralResultsContext effect
  → pipelineRunner (web worker)
  → NeuralPipeline.js / utilities/*.js  (the algorithm)
  → pipelineResults (peakResults / burstResults / processedSignal)
  → NeuralGraph renders
```

Most sliders use `useDraftSlider`, so the pipeline only re-runs when you **release** the slider (not on every pixel during the drag). If a slider feels unresponsive while dragging, that is intentional — let go and the chart updates.

### What lives on the graph

| Visual element | Source | Where drawn |
|---|---|---|
| Main trace (blue line) | `processedSignal` | [NeuralGraph.js](../src/components/NeuralAnalysis/subComponents/NeuralGraph/NeuralGraph.js) |
| Spike markers (red dots, radius 5) | `peakResults` | NeuralGraph.js:164-168 |
| Spike base markers (white dots, radius 4) | left/right base of each spike | NeuralGraph.js:197-209 |
| Outlier markers | spike with `isOutlier: true` | NeuralGraph.js:226 |
| Burst boxes (pale-yellow vertical strips) | `burstResults` | NeuralGraph.js:467-477 |

If you are not seeing one of these elements, the corresponding *master toggle* for that section is probably off — see the gate conditions in each section below.

---

## 1. Outlier Handling

Source: [HandleOutlierControls.jsx](../src/components/NeuralAnalysis/subComponents/NeuralGraph/controls/HandleOutlierControls.jsx) · algorithm: [outlierRemoval.js](../src/components/NeuralAnalysis/utilities/outlierRemoval.js) · called from [NeuralPipeline.js:196](../src/components/NeuralAnalysis/NeuralPipeline.js#L196).

**Master gate.** Outlier removal runs only when **both** of these are true:

1. The **Noise Suppression** master switch is on.
2. The **Handle Outliers** toggle in this panel is on.

If either is off, **moving the sliders below does nothing**. There is no visible UI indication that the noise-suppression dependency exists.

**What "removing" actually means.** The algorithm does not delete outliers. It marks each flagged peak with `isOutlier: true` and feeds it back into the spike results. On the graph these render as **orange hollow rings** (distinct from the solid red dots used for ordinary spikes), so the Outlier Handling sliders have a clearly visible effect on the chart.

**How the two thresholds combine.** A peak is flagged as an outlier if its prominence exceeds **either** the percentile threshold **or** the median-multiplier threshold (the algorithm uses `Math.max(percentileProminence, medianProminence * multiplier)` — i.e. the stricter of the two wins). Practical consequence: if one slider's threshold is far stricter than the other, the looser slider can move with no visible change.

**To isolate one slider's effect, set the *other* slider to its UI minimum** — that shrinks its branch's contribution to the `max` and lets your slider dominate:

- To exercise **`outlierPercentile`** in isolation, set `outlierMultiplier` to its UI min (`0.5`). The `median × 0.5` branch is then small, and the percentile branch wins the `max`.
- To exercise **`outlierMultiplier`** in isolation, set `outlierPercentile` to its UI min (`50`). The percentile branch then yields the ~median prominence, which is dominated by `median × multiplier` for any `multiplier > 1`.

### Percentile Threshold

| | |
|---|---|
| Units | percentile (50–99) |
| Default | 95 |
| Range / Step | 50 → 99, step 1 |
| State | `outlierPercentile` (NeuralSettingsContext) |

**What it does.** Ranks every detected peak by prominence. The slider value sets the "top X% by prominence" cutoff: at 95 the algorithm targets the top 5%; at 50 the top 50%.

**What to look for on the graph.**
- **Raising it** (95 → 99): fewer peaks qualify as outliers. Spikes that had been re-marked as outliers reappear as ordinary spike markers.
- **Lowering it** (95 → 50): more peaks qualify. More ordinary spikes flip to outlier styling.

If you see no change at all, suspect (a) the master gate is off, or (b) the median-multiplier threshold is dominant — try setting `Median Multiplier` to its max (5.0×) and try again.

### Median Multiplier

| | |
|---|---|
| Units | × (multiple of median prominence) |
| Default | 2.0× |
| Range / Step | 0.5 → 5.0, step 0.1 |
| State | `outlierMultiplier` (NeuralSettingsContext) |

**What it does.** Computes the median prominence across all peaks and uses `median × multiplier` as an outlier threshold. A peak above that value is flagged.

**What to look for on the graph.**
- **Raising it** (2× → 5×): peaks must be far above the median to count as outliers. Fewer outlier markers; previously-flagged peaks return to normal spike styling.
- **Lowering it** (2× → 0.5×): peaks only slightly above the median get flagged. Many ordinary spikes flip to outlier styling.

Same caveat as Percentile Threshold — when the percentile-derived threshold is dominant, moving this slider may have no visible effect.

### Handle Outliers (toggle)

| | |
|---|---|
| Default | on |
| State | `handleOutliers` (NeuralSettingsContext) |

When off, the outlier-removal step is skipped entirely; both sliders become disabled and the graph shows no outlier-styled spikes regardless of the values you had set.

### Known gaps

- **Silent gating on noise suppression.** Outlier removal silently no-ops when `noiseSuppressionActive` is false. Worth surfacing in the UI eventually; until then, remember this every time the sliders appear dead. See [NeuralPipeline.js:196](../src/components/NeuralAnalysis/NeuralPipeline.js#L196).
- **Threshold combining is `max`, not `min`.** [outlierRemoval.js:93-96](../src/components/NeuralAnalysis/utilities/outlierRemoval.js#L93-L96). One dominant threshold hides the other.
- **Outliers are *re-marked*, not removed.** [outlierRemoval.js:325-326](../src/components/NeuralAnalysis/utilities/outlierRemoval.js#L325-L326). If your mental model is "they should disappear from the trace," reconcile that with the actual styling on the chart.

---

## 2. Burst Detection

Source: [BurstDetectionControls.jsx](../src/components/NeuralAnalysis/subComponents/NeuralGraph/controls/BurstDetectionControls.jsx) · algorithm: [burstDetection.js](../src/components/NeuralAnalysis/utilities/burstDetection.js) · called from [NeuralPipeline.js:299](../src/components/NeuralAnalysis/NeuralPipeline.js#L299).

**Master gate.** Both pipeline execution **and** rendering are gated on **Show Bursts** being on. When off, `burstResults` is empty and no yellow boxes are drawn.

**Algorithm in one line.** A burst is a maximal run of spikes whose consecutive inter-spike intervals are all `≤ Max ISI`, containing at least `Min Spikes Per Burst` members. It is a single linear sweep over the time-sorted spikes.

### Max Inter-Spike Interval

| | |
|---|---|
| Units | ms |
| Default | 50 ms |
| Range / Step | 0 → 250, step 5 |
| State | `maxInterSpikeInterval` |

**What it does.** Maximum allowed gap between two consecutive spikes for them to still belong to the same burst. The first gap that exceeds this value ends the current burst and starts a new one.

**What to look for on the graph.**
- **Raising it**: nearby groups merge into longer, wider yellow boxes. **Fewer** boxes overall, each spanning **more** time.
- **Lowering it**: bursts fracture. **More** boxes, each narrower.

### Min Spikes Per Burst

| | |
|---|---|
| Units | spike count |
| Default | 3 |
| Range / Step | 2 → 10, step 1 |
| State | `minSpikesPerBurst` |

**What it does.** Runs of fewer than this many spikes are not emitted as bursts at all — they are silently dropped.

**What to look for on the graph.**
- **Raising it**: short bursts disappear from the chart. **Fewer** yellow boxes.
- **Lowering it**: short runs that were previously dropped appear. **More** yellow boxes, including some very narrow ones.

### Show Bursts (toggle)

| | |
|---|---|
| Default | off |
| State | `showBursts` |

When off, the two sliders are disabled, the pipeline skips burst detection, and the chart draws no yellow boxes.

### Known gaps

None observed — both sliders thread cleanly from UI to the linear-sweep algorithm. If burst behavior looks wrong, the issue is most likely upstream in spike detection (no spikes → no bursts).

---

## 3. Spike Detection

Source: [SpikeDetectionControls.jsx](../src/components/NeuralAnalysis/subComponents/NeuralGraph/controls/SpikeDetectionControls.jsx) · algorithm: [detectSpikes.js](../src/components/NeuralAnalysis/utilities/detectSpikes.js) · called from [NeuralPipeline.js:261-269](../src/components/NeuralAnalysis/NeuralPipeline.js#L261-L269).

The algorithm applies its filters in this order — important when reasoning about which slider should affect which peaks:

```
1. Prominence                  (initial gate)
2. Window Width                (group nearby peaks; keep tallest per group)
3. Noise Floor (× σ)           (drop peaks below absolute σ-scaled threshold)
4. K-means cluster split       (drop the lower of two prominence clusters)
5. Min Width                   (drop narrow peaks)
6. Symmetry                    (drop one-sided peaks)
7. Min Distance                (enforce minimum sample gap between spikes)
```

Each slider acts at one stage. The `Cluster Separation` slider gates step 4 (it can also wipe out the entire spike set on noisy wells — see below). The `Noise Window` slider does not act on spikes directly; it changes which σ is used by the `Noise Floor` filter.

### Prominence

| | |
|---|---|
| Units | mV |
| Default | 1 |
| Range / Step | 0 → dynamic max (`max(suggestedSpikeProminence × 1.2, 100)`), dynamic step |
| State | `spikeProminence` |

**What it does.** Minimum height a peak must rise above its surrounding baseline (the lower of left/right base) to count as a spike candidate at all.

**What to look for on the graph.**
- **Raising it**: red spike markers disappear from the trace, starting with the shortest. Only tall, sharp events remain marked.
- **Lowering it**: red markers proliferate, including over low-amplitude noise.

### Window Width

| | |
|---|---|
| Units | samples |
| Default | 20 |
| Range / Step | 5 → 200, step 5 |
| State | `spikeWindow` |

**What it does.** Defines a sample-window for grouping nearby peaks. Within each window only the tallest peak is kept.

**What to look for on the graph.**
- **Raising it**: clusters of closely-spaced markers collapse into single markers. Doublets become singlets. Spike count drops.
- **Lowering it**: fine structure inside fast events becomes visible. Spike count rises.

### Min Distance

| | |
|---|---|
| Units | samples |
| Default | 0 (disabled) |
| Range / Step | 0 → 100, step 1 |
| State | `spikeMinDistance` |

**What it does.** Enforces a minimum sample gap between detected spikes (a refractory-style filter applied at the end of the pipeline). When 0, no minimum is enforced.

**What to look for on the graph.**
- **Raising it**: any two markers closer than this gap collapse — the later one is dropped. The trace becomes sparser in burst regions.
- **Lowering it (or 0)**: every spike that passed earlier filters is kept.

### Cluster Separation

| | |
|---|---|
| Units | σ (multiplier on robust noise std) |
| Default | 1.0 |
| Range / Step | 0.1 → 5.0, step 0.1 |
| State | `stdMultiplier` |

**What it does.** This slider is a **binary gate, not a gradient.** The k-means step splits the remaining peak prominences into two clusters and **always** drops the lower one — that behavior does not change with the slider. What the slider controls is one additional all-or-nothing check: when **both** the higher cluster's centroid AND the cluster separation are small relative to `stdMultiplier × robustStd`, the algorithm bails out and returns **zero** spikes (the assumption being that the signal is too noisy to distinguish spikes from noise at all).

**What to look for on the graph.**
- **Raising it**: the bail-out gate fires more often. On clean wells you usually see no change (the high cluster sits well above the threshold either way). On borderline / noisy wells, the spike scatter can drop to **zero** abruptly — not a smooth thinning.
- **Lowering it**: the bail-out is less likely to fire, so noisy wells that previously returned zero spikes start returning the k-means result instead.

If the slider seems to "do nothing" on a clean well, that is expected — the bail-out only triggers when prominences are tightly clustered. Try the slider on a deliberately noisy well to see the effect.

### Noise Floor (× σ)

| | |
|---|---|
| Units | σ (multiplier on noise std) |
| Default | 0 (disabled) |
| Range / Step | 0 → 50.0, step 0.5 |
| State | `noiseFloorMultiplier` |
| Display | `"Off"` when 0; otherwise `"{value}× ≈ {absolute_mV}"` |

**What it does.** Absolute prominence cutoff applied **before** k-means clustering, expressed as a multiple of the noise standard deviation. Any peak whose prominence is below `noiseFloorMultiplier × σ` is dropped outright. When 0, the filter is bypassed and all peaks above the `Prominence` slider go through k-means.

The σ used here is either the global `robustStd` (default) or a per-block local σ — controlled by the `Noise Window` slider below.

**What to look for on the graph.**
- **Raising it**: small-amplitude spike markers vanish. Effect resembles raising `Prominence`, but it kicks in at a different stage and is expressed in σ units rather than mV.
- **Lowering it (or 0)**: more low-amplitude candidates pass through to k-means.

### Min Width

| | |
|---|---|
| Units | samples |
| Default | 5 |
| Range / Step | 1 → 200, step 1 |
| State | `spikeMinWidth` |

**What it does.** Discards peaks whose base-to-base width is fewer than this many samples. Filters single-sample artifacts.

**What to look for on the graph.**
- **Raising it**: narrow spikes vanish. The chart becomes cleaner in noisy regions.
- **Lowering it**: single-sample glitches start showing up as spikes.

### Symmetry (Min Prominence Ratio)

| | |
|---|---|
| Units | ratio (0–1) |
| Default | 0.01 |
| Range / Step | 0.0 → 1.0, step 0.05 |
| State | `spikeMinProminenceRatio` |

**What it does.** Compares the left and right prominences of each peak. The ratio `min(left, right) / max(left, right)` must be at least this value. 1.0 demands perfectly symmetric peaks; 0.0 accepts any shape.

**What to look for on the graph.**
- **Raising it**: lopsided "bumps" near edges or step changes get dropped. Spike count falls.
- **Lowering it**: asymmetric features get marked as spikes. Spike count rises, especially near the start/end of the trace and at signal artifacts.

### Noise Window

| | |
|---|---|
| Units | samples |
| Default | 0 (global σ) |
| Range / Step | 0 → 10000, step 100 |
| State | `noiseWindowSize` |
| Display | `"Global σ"` when 0; otherwise sample count |

**What it does.** Switches the σ used by the `Noise Floor` filter between global and local. When 0, one global `robustStd` is used for the entire trace. When non-zero, the signal is split into non-overlapping blocks of this width and per-block σ values are computed; each peak uses the σ of the block it falls inside.

**What to look for on the graph.**
- **0 (Global σ)**: a single noise threshold across the whole trace. Quiet regions and noisy regions are judged by the same yardstick.
- **Non-zero (Local σ)**: noisy regions get higher thresholds and quiet regions get lower ones. Spikes in quiet regions of an otherwise-noisy trace become easier to detect; spikes in the noisy regions become harder.
- **Smaller window**: more spatially adaptive — finer resolution of "how noisy is *here*."
- **Larger window**: smoother, more global-like behavior.

If `Noise Floor` is set to 0, this slider has no effect (the noise floor filter is bypassed entirely).

### Known gaps

- **Cluster Separation is a binary gate, not a gradient.** [detectSpikes.js:379-396](../src/components/NeuralAnalysis/utilities/detectSpikes.js#L379-L396). On clean wells the slider has no visible effect; on noisy wells it abruptly drops the spike count to zero when the bail-out fires. This is the expected behavior — see the section above. Lower the slider (or raise `Prominence`) to recover from a zeroed-out well.
- **Prominence max scales per well.** [SpikeDetectionControls.jsx:69-74](../src/components/NeuralAnalysis/subComponents/NeuralGraph/controls/SpikeDetectionControls.jsx#L69-L74). Switching to a well with very different amplitude moves the slider thumb's position even if the absolute mV value is unchanged.
- **Prominence and Window Width overrides are per-well.** Adjusting them on well A and then switching to well B falls back to B's auto-suggestion — your edits do not persist across wells. By design, but easy to miss.

---

## When a slider "doesn't do anything"

A quick triage checklist:

1. **Is the master toggle on?** Outlier Handling needs both Noise Suppression and Handle Outliers; Burst Detection needs Show Bursts.
2. **Is another slider dominating?** Most common in Outlier Handling (percentile vs multiplier) and in Spike Detection (high Prominence shadows Noise Floor, etc.).
3. **Did you release the slider?** `useDraftSlider` debounces — the pipeline only re-runs on release.
4. **Did you switch wells?** Per-well overrides on Prominence/Window Width reset to auto-suggestion on a well change.
5. **Is the upstream stage empty?** Bursts need spikes. If there are no red dots, there will be no yellow boxes.

If none of those apply and the chart still does not move, that is a real bug — start at the algorithm file linked in the section above.

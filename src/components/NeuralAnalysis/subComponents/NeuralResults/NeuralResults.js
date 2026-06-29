import React, { useMemo } from "react";
import { Grid, Divider, Tooltip } from "@mui/material";
import { Panel } from "../../../ui";
import {
  useNeuralInteraction,
  useNeuralResults,
  useNeuralSelection,
} from "../../NeuralProvider";
import "./NeuralResults.css";

// Explicit min/max over a `keyFn` projection of an array. Replaces the
// `Math.min(...arr.map(keyFn))` pattern, which blows V8's argument-count
// limit on large arrays — a real risk here when `peakResults` covers a
// long recording with thousands of detected spikes.
function minMaxOf(items, keyFn) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < items.length; i++) {
    const v = keyFn(items[i]);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min: items.length ? min : 0, max: items.length ? max : 0 };
}

function median(sortedAsc) {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  return n % 2 === 0
    ? (sortedAsc[n / 2 - 1] + sortedAsc[n / 2]) / 2
    : sortedAsc[Math.floor(n / 2)];
}

// Pure calculator functions hoisted to module scope so they aren't
// re-allocated on every render of <NeuralResults>. They close over
// nothing — every dependency comes in via arguments — so this is
// purely a memory/identity optimization with bit-identical output.
//
// Exported so NeuralAnalysisModal can compute the per-ROI metric
// object once and pass it both to <NeuralResults> (display) and to
// <NeuralReportModal> (CSV per-ROI section).

export const calculateSpikeFrequency = (spikes, startTime, endTime) => {
  const spikesInRange = spikes.filter(
    (spike) => spike.time >= startTime && spike.time <= endTime
  );
  const duration = endTime - startTime;
  const total = spikesInRange.length;
  const spikesPerSecond = duration > 0 ? total / duration : 0;
  let averageFrequency = 0;
  let medianFrequency = 0;
  let meanIsi = 0;
  let medianIsi = 0;
  if (total >= 2) {
    const sortedTimes = spikesInRange
      .map((s) => s.time)
      .sort((a, b) => a - b);
    const isis = new Array(sortedTimes.length - 1);
    for (let i = 1; i < sortedTimes.length; i++) {
      isis[i - 1] = sortedTimes[i] - sortedTimes[i - 1];
    }
    meanIsi = isis.reduce((s, v) => s + v, 0) / isis.length;
    const sortedIsis = [...isis].sort((a, b) => a - b);
    medianIsi = median(sortedIsis);
    averageFrequency = meanIsi > 0 ? 1 / meanIsi : 0;
    medianFrequency = medianIsi > 0 ? 1 / medianIsi : 0;
  }
  return {
    total,
    spikesPerSecond,
    averageFrequency,
    medianFrequency,
    meanIsi,
    medianIsi,
  };
};

export const calculateSpikeAmplitude = (spikes, startTime, endTime) => {
  const spikesInRange = spikes.filter(
    (spike) => spike.time >= startTime && spike.time <= endTime
  );
  if (spikesInRange.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }
  const amplitudes = spikesInRange.map((spike) => spike.amplitude);
  const average = amplitudes.reduce((s, v) => s + v, 0) / amplitudes.length;
  const sorted = [...amplitudes].sort((a, b) => a - b);
  const { min, max } = minMaxOf(amplitudes, (v) => v);
  return { average, median: median(sorted), min, max };
};

export const calculateSpikeWidth = (spikes, startTime, endTime) => {
  const spikesInRange = spikes.filter(
    (spike) =>
      spike.time >= startTime &&
      spike.time <= endTime &&
      typeof spike.width === "number"
  );
  if (spikesInRange.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }
  const widths = spikesInRange.map((spike) => spike.width);
  const average = widths.reduce((s, v) => s + v, 0) / widths.length;
  const sorted = [...widths].sort((a, b) => a - b);
  const { min, max } = minMaxOf(widths, (v) => v);
  return { average, median: median(sorted), min, max };
};

export const calculateSpikeAUC = (spikes, startTime, endTime) => {
  const spikesInRange = spikes.filter(
    (spike) =>
      spike.time >= startTime &&
      spike.time <= endTime &&
      typeof spike.auc === "number"
  );
  if (spikesInRange.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }
  const aucs = spikesInRange.map((spike) => spike.auc);
  const average = aucs.reduce((s, v) => s + v, 0) / aucs.length;
  const sorted = [...aucs].sort((a, b) => a - b);
  const { min, max } = minMaxOf(aucs, (v) => v);
  return { average, median: median(sorted), min, max };
};

export const calculateMaxSpikeSignal = (spikes, startTime, endTime) => {
  const spikesInRange = spikes.filter(
    (spike) => spike.time >= startTime && spike.time <= endTime
  );
  if (spikesInRange.length === 0) return 0;
  const { max } = minMaxOf(spikesInRange, (s) => s.peakCoords.y);
  return max;
};

export const calculateBurstMetrics = (bursts, startTime, endTime) => {
  if (!Array.isArray(bursts) || bursts.length === 0) {
    return {
      total: 0,
      duration: { average: 0, median: 0 },
      interBurstInterval: { average: 0, median: 0 },
    };
  }
  const burstsInRange = bursts.filter(
    (burst) => burst.startTime >= startTime && burst.endTime <= endTime
  );
  if (burstsInRange.length === 0) {
    return {
      total: 0,
      duration: { average: 0, median: 0 },
      interBurstInterval: { average: 0, median: 0 },
    };
  }
  const durations = burstsInRange.map((burst) => burst.duration);
  const avgDuration = durations.reduce((s, v) => s + v, 0) / durations.length;
  const medianDuration = median([...durations].sort((a, b) => a - b));

  const interBurstIntervals = [];
  for (let i = 1; i < burstsInRange.length; i++) {
    const interval =
      burstsInRange[i].startTime - burstsInRange[i - 1].endTime;
    if (interval > 0) interBurstIntervals.push(interval);
  }
  const avgIBI =
    interBurstIntervals.length > 0
      ? interBurstIntervals.reduce((s, v) => s + v, 0) /
        interBurstIntervals.length
      : 0;
  const medianIBI = median([...interBurstIntervals].sort((a, b) => a - b));

  return {
    total: burstsInRange.length,
    duration: { average: avgDuration, median: medianDuration },
    interBurstInterval: { average: avgIBI, median: medianIBI },
  };
};

// Per client request (Dave Weaver, 2026-05-27), most metric values in
// the UI round to the nearest integer. Frequencies (Hz) need sub-
// integer precision because typical spike rates are < 1 Hz, so callers
// pass decimals=2 for those.
const formatNumber = (num, decimals = 0) => {
  if (typeof num !== "number" || isNaN(num)) return "0";
  return decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
};

// MetricCard / MetricItem were previously declared *inside* the parent
// component body — which makes React see a fresh component type on
// every render and forces the entire subtree to unmount + remount
// rather than just re-render. Hoisting them to module scope means each
// renders as a stable type; React keeps the existing DOM nodes around
// and only diffs props.
const MetricCard = ({ title, children }) => (
  <Panel variant="dark" className="neural-result-card">
    <h6 className="neural-result-card__title">{title}</h6>
    {children}
  </Panel>
);

// Tooltip text explaining how each metric is computed. Shown on hover
// over the corresponding MetricItem.
const TIPS = {
  totalSpikes: "Count of spikes detected within the analysis window.",
  avgFrequency:
    "1 / (mean inter-spike interval). Average firing rate between consecutive spikes — reflects how fast the cell fires when it is firing.",
  medFrequency:
    "1 / (median inter-spike interval). Less sensitive to outlier intervals than the average.",
  spikesPerSecond:
    "Total spikes ÷ analysis-window duration. Window-averaged firing rate; includes silent gaps, so it drops when spikes cluster in a small portion of the recording.",
  meanIsi:
    "Mean inter-spike interval in seconds — average time between consecutive spikes. Reciprocal of Average Frequency.",
  medianIsi:
    "Median inter-spike interval in seconds — middle value of all spike-to-spike gaps. Less sensitive to outlier intervals than the mean.",
  avgAmp: "Mean peak Y-value across all spikes in the window.",
  medAmp: "Median peak Y-value across all spikes. Less sensitive to outliers.",
  minAmp: "Smallest peak Y-value observed in the window.",
  maxAmp: "Largest peak Y-value observed in the window.",
  avgWidth:
    "Mean spike width, measured as the sample count between the left and right base of each spike.",
  medWidth: "Median spike width in samples.",
  minWidth: "Narrowest spike width observed in the window.",
  maxWidth: "Widest spike width observed in the window.",
  avgAuc:
    "Mean area under the curve across all spikes (integral from left base to right base, baseline-subtracted).",
  medAuc: "Median area under the curve across all spikes.",
  minAuc: "Smallest single-spike AUC observed in the window.",
  maxAuc: "Largest single-spike AUC observed in the window.",
  maxSignal: "Highest peak Y-value across every spike in the window.",
  totalBursts:
    "Number of bursts detected. A burst is a run of ≥ Min-Spikes-Per-Burst consecutive spikes whose inter-spike intervals are all ≤ Max-Inter-Spike-Interval (set in the Burst Detection controls).",
  avgBurstDuration:
    "Mean burst duration — last-spike time minus first-spike time within each burst.",
  medBurstDuration: "Median burst duration across all detected bursts.",
  avgIBI:
    "Mean inter-burst interval — time gap between the last spike of one burst and the first spike of the next.",
  medIBI: "Median inter-burst interval across consecutive burst pairs.",
};

const MetricItem = ({ label, value, unit = "", tooltip = "" }) => {
  const body = (
    <div className="neural-result-item">
      {label}:{" "}
      <span className="neural-result-item__value">
        {value}
        {unit}
      </span>
    </div>
  );
  if (!tooltip) return body;
  return (
    <Tooltip title={tooltip} placement="top" arrow>
      {body}
    </Tooltip>
  );
};

const NeuralResults = () => {
  const { selectedWell } = useNeuralSelection();
  const { roiList } = useNeuralInteraction();
  const { pipelineResults, controlScalingActive } = useNeuralResults();
  const peakResults = pipelineResults.spikeResults;
  const burstResults = pipelineResults.burstResults;
  const processedSignal = pipelineResults.processedSignal;

  // Calculate metrics for each ROI
  const roiMetrics = useMemo(() => {
    if (!Array.isArray(roiList) || roiList.length === 0) return {};
    const metrics = {};
    roiList.forEach((roi, index) => {
      if (roi && roi.xMin !== undefined && roi.xMax !== undefined) {
        const spikesInROI = peakResults.filter(
          (spike) => spike.time >= roi.xMin && spike.time <= roi.xMax
        );
        const burstsInROI = burstResults.filter(
          (burst) => burst.startTime >= roi.xMin && burst.endTime <= roi.xMax
        );
        metrics[`ROI ${index + 1}`] = {
          spikeFrequency: calculateSpikeFrequency(spikesInROI, roi.xMin, roi.xMax),
          spikeAmplitude: calculateSpikeAmplitude(spikesInROI, roi.xMin, roi.xMax),
          spikeWidth: calculateSpikeWidth(spikesInROI, roi.xMin, roi.xMax),
          spikeAUC: calculateSpikeAUC(spikesInROI, roi.xMin, roi.xMax),
          maxSpikeSignal: calculateMaxSpikeSignal(spikesInROI, roi.xMin, roi.xMax),
          burstMetrics: calculateBurstMetrics(burstsInROI, roi.xMin, roi.xMax),
        };
      }
    });
    return metrics;
  }, [peakResults, burstResults, roiList]);

  // Overall metrics use the recording's full time range as the
  // [startTime, endTime] window. Previously we derived these from
  // `minMaxOf(peakResults, s => s.time)` — i.e., the spread of
  // detected spike times — which made the spike-frequency divisor
  // wrong whenever spikes clustered in a small portion of the run
  // (e.g., 55 spikes inside a 0.5 s burst of a 30 s recording
  // reported 110 Hz instead of ~1.8 Hz). The amplitude / width /
  // AUC / max-signal calculators use these bounds only as an
  // inclusive filter, so widening the window doesn't change those
  // metrics (every detected spike now qualifies, which is correct).
  const overallMetrics = useMemo(() => {
    if (!Array.isArray(peakResults) || peakResults.length === 0) return null;
    if (!Array.isArray(processedSignal) || processedSignal.length === 0) {
      return null;
    }
    const startTime = processedSignal[0].x;
    const endTime = processedSignal[processedSignal.length - 1].x;
    return {
      spikeFrequency: calculateSpikeFrequency(peakResults, startTime, endTime),
      spikeAmplitude: calculateSpikeAmplitude(peakResults, startTime, endTime),
      spikeWidth: calculateSpikeWidth(peakResults, startTime, endTime),
      spikeAUC: calculateSpikeAUC(peakResults, startTime, endTime),
      maxSpikeSignal: calculateMaxSpikeSignal(peakResults, startTime, endTime),
      burstMetrics: calculateBurstMetrics(burstResults, startTime, endTime),
    };
  }, [peakResults, burstResults, processedSignal]);

  // Control-well scaling re-expresses peak height / AUC as a % of the
  // control wells (control median peak = 100). It only affects those
  // magnitude metrics — frequency, ISI, and width stay in native units.
  const scaleSuffix = controlScalingActive ? " (% of control)" : "";
  const scaleUnit = controlScalingActive ? " %" : "";

  return (
    <div className="neural-results">
      <h6 className="neural-results__well-title">
        Analysis Results - {selectedWell?.key || "Unknown Well"}
      </h6>

      {controlScalingActive && (
        <p
          className="neural-results__scale-note"
          style={{ margin: "2px 0 8px", fontSize: 12, color: "#ffd479" }}
        >
          Peak height &amp; AUC shown as % of control (control median peak =
          100).
        </p>
      )}

      {/* Overall Spike Detection Summary (All Data) */}
      <section className="neural-results__section">
        <h5 className="neural-results__section-title neural-results__section-title--overall">
          Overall Spike Detection (All Data)
        </h5>

        {!overallMetrics ? (
          <Panel variant="dark" className="neural-results__placeholder">
            No spikes detected
          </Panel>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Frequency">
                <MetricItem label="Total Spikes" value={overallMetrics.spikeFrequency.total} tooltip={TIPS.totalSpikes} />
                <MetricItem label="Average Frequency" value={formatNumber(overallMetrics.spikeFrequency.averageFrequency, 4)} unit=" Hz" tooltip={TIPS.avgFrequency} />
                <MetricItem label="Median Frequency" value={formatNumber(overallMetrics.spikeFrequency.medianFrequency, 4)} unit=" Hz" tooltip={TIPS.medFrequency} />
                <MetricItem label="Spikes Per Second" value={formatNumber(overallMetrics.spikeFrequency.spikesPerSecond, 4)} unit=" Hz" tooltip={TIPS.spikesPerSecond} />
                <Divider className="neural-result-card__divider" />
                <h6 className="neural-result-card__subtitle">Inter-Spike Interval</h6>
                <MetricItem label="Mean ISI" value={formatNumber(overallMetrics.spikeFrequency.meanIsi, 4)} unit=" s" tooltip={TIPS.meanIsi} />
                <MetricItem label="Median ISI" value={formatNumber(overallMetrics.spikeFrequency.medianIsi, 4)} unit=" s" tooltip={TIPS.medianIsi} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title={`Spike Amplitude${scaleSuffix}`}>
                <MetricItem label="Average Amplitude" value={formatNumber(overallMetrics.spikeAmplitude.average)} unit={scaleUnit} tooltip={TIPS.avgAmp} />
                <MetricItem label="Median Amplitude" value={formatNumber(overallMetrics.spikeAmplitude.median)} unit={scaleUnit} tooltip={TIPS.medAmp} />
                <MetricItem label="Min Amplitude" value={formatNumber(overallMetrics.spikeAmplitude.min)} unit={scaleUnit} tooltip={TIPS.minAmp} />
                <MetricItem label="Max Amplitude" value={formatNumber(overallMetrics.spikeAmplitude.max)} unit={scaleUnit} tooltip={TIPS.maxAmp} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Width">
                <MetricItem label="Average Width" value={formatNumber(overallMetrics.spikeWidth.average)} unit=" samples" tooltip={TIPS.avgWidth} />
                <MetricItem label="Median Width" value={formatNumber(overallMetrics.spikeWidth.median)} unit=" samples" tooltip={TIPS.medWidth} />
                <MetricItem label="Min Width" value={formatNumber(overallMetrics.spikeWidth.min)} unit=" samples" tooltip={TIPS.minWidth} />
                <MetricItem label="Max Width" value={formatNumber(overallMetrics.spikeWidth.max)} unit=" samples" tooltip={TIPS.maxWidth} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title={`Spike AUC${scaleSuffix}`}>
                <MetricItem label="Average AUC" value={formatNumber(overallMetrics.spikeAUC.average)} unit={scaleUnit} tooltip={TIPS.avgAuc} />
                <MetricItem label="Median AUC" value={formatNumber(overallMetrics.spikeAUC.median)} unit={scaleUnit} tooltip={TIPS.medAuc} />
                <MetricItem label="Min AUC" value={formatNumber(overallMetrics.spikeAUC.min)} unit={scaleUnit} tooltip={TIPS.minAuc} />
                <MetricItem label="Max AUC" value={formatNumber(overallMetrics.spikeAUC.max)} unit={scaleUnit} tooltip={TIPS.maxAuc} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Max Spike Signal">
                <MetricItem label="Max Spike Signal" value={formatNumber(overallMetrics.maxSpikeSignal)} tooltip={TIPS.maxSignal} />
              </MetricCard>
            </Grid>

            {overallMetrics.burstMetrics.total > 0 && (
              <Grid item xs={12}>
                <MetricCard title="Burst Metrics">
                  <MetricItem label="Total Bursts" value={overallMetrics.burstMetrics.total} tooltip={TIPS.totalBursts} />
                  <Divider className="neural-result-card__divider" />
                  <h6 className="neural-result-card__subtitle">Burst Duration</h6>
                  <MetricItem label="Average Duration" value={formatNumber(overallMetrics.burstMetrics.duration.average)} unit=" s" tooltip={TIPS.avgBurstDuration} />
                  <MetricItem label="Median Duration" value={formatNumber(overallMetrics.burstMetrics.duration.median)} unit=" s" tooltip={TIPS.medBurstDuration} />

                  <Divider className="neural-result-card__divider" />
                  <h6 className="neural-result-card__subtitle">Inter-Burst Interval</h6>
                  <MetricItem label="Average IBI" value={formatNumber(overallMetrics.burstMetrics.interBurstInterval.average)} unit=" s" tooltip={TIPS.avgIBI} />
                  <MetricItem label="Median IBI" value={formatNumber(overallMetrics.burstMetrics.interBurstInterval.median)} unit=" s" tooltip={TIPS.medIBI} />
                </MetricCard>
              </Grid>
            )}
          </Grid>
        )}
      </section>

      {/* ROI-Specific Metrics (if any ROIs defined) */}
      {Object.keys(roiMetrics).length > 0 && (
        <>
          <Divider className="neural-result-card__divider" />
          <h5 className="neural-results__section-title">ROI-Specific Analysis</h5>
        </>
      )}

      {Object.entries(roiMetrics).map(([roiName, metrics]) => (
        <section key={roiName} className="neural-results__section">
          <h5 className="neural-results__section-title">{roiName}</h5>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Frequency">
                <MetricItem label="Total Spikes" value={metrics.spikeFrequency.total} tooltip={TIPS.totalSpikes} />
                <MetricItem label="Average Frequency" value={formatNumber(metrics.spikeFrequency.averageFrequency, 4)} unit=" Hz" tooltip={TIPS.avgFrequency} />
                <MetricItem label="Median Frequency" value={formatNumber(metrics.spikeFrequency.medianFrequency, 4)} unit=" Hz" tooltip={TIPS.medFrequency} />
                <MetricItem label="Spikes Per Second" value={formatNumber(metrics.spikeFrequency.spikesPerSecond, 4)} unit=" Hz" tooltip={TIPS.spikesPerSecond} />
                <Divider className="neural-result-card__divider" />
                <h6 className="neural-result-card__subtitle">Inter-Spike Interval</h6>
                <MetricItem label="Mean ISI" value={formatNumber(metrics.spikeFrequency.meanIsi, 4)} unit=" s" tooltip={TIPS.meanIsi} />
                <MetricItem label="Median ISI" value={formatNumber(metrics.spikeFrequency.medianIsi, 4)} unit=" s" tooltip={TIPS.medianIsi} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Amplitude">
                <MetricItem label="Average Amplitude" value={formatNumber(metrics.spikeAmplitude.average)} tooltip={TIPS.avgAmp} />
                <MetricItem label="Median Amplitude" value={formatNumber(metrics.spikeAmplitude.median)} tooltip={TIPS.medAmp} />
                <MetricItem label="Min Amplitude" value={formatNumber(metrics.spikeAmplitude.min)} tooltip={TIPS.minAmp} />
                <MetricItem label="Max Amplitude" value={formatNumber(metrics.spikeAmplitude.max)} tooltip={TIPS.maxAmp} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Width">
                <MetricItem label="Average Width" value={formatNumber(metrics.spikeWidth.average)} unit=" samples" tooltip={TIPS.avgWidth} />
                <MetricItem label="Median Width" value={formatNumber(metrics.spikeWidth.median)} unit=" samples" tooltip={TIPS.medWidth} />
                <MetricItem label="Min Width" value={formatNumber(metrics.spikeWidth.min)} unit=" samples" tooltip={TIPS.minWidth} />
                <MetricItem label="Max Width" value={formatNumber(metrics.spikeWidth.max)} unit=" samples" tooltip={TIPS.maxWidth} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike AUC">
                <MetricItem label="Average AUC" value={formatNumber(metrics.spikeAUC.average)} tooltip={TIPS.avgAuc} />
                <MetricItem label="Median AUC" value={formatNumber(metrics.spikeAUC.median)} tooltip={TIPS.medAuc} />
                <MetricItem label="Min AUC" value={formatNumber(metrics.spikeAUC.min)} tooltip={TIPS.minAuc} />
                <MetricItem label="Max AUC" value={formatNumber(metrics.spikeAUC.max)} tooltip={TIPS.maxAuc} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Max Spike Signal">
                <MetricItem label="Max Spike Signal" value={formatNumber(metrics.maxSpikeSignal)} tooltip={TIPS.maxSignal} />
              </MetricCard>
            </Grid>
            <Grid item xs={12}>
              <MetricCard title="Burst Metrics">
                <MetricItem label="Total Bursts" value={metrics.burstMetrics.total} tooltip={TIPS.totalBursts} />
                <Divider className="neural-result-card__divider" />
                <h6 className="neural-result-card__subtitle">Burst Duration</h6>
                <MetricItem label="Average Duration" value={formatNumber(metrics.burstMetrics.duration.average)} unit=" s" tooltip={TIPS.avgBurstDuration} />
                <MetricItem label="Median Duration" value={formatNumber(metrics.burstMetrics.duration.median)} unit=" s" tooltip={TIPS.medBurstDuration} />

                <Divider className="neural-result-card__divider" />
                <h6 className="neural-result-card__subtitle">Inter-Burst Interval</h6>
                <MetricItem label="Average IBI" value={formatNumber(metrics.burstMetrics.interBurstInterval.average)} unit=" s" tooltip={TIPS.avgIBI} />
                <MetricItem label="Median IBI" value={formatNumber(metrics.burstMetrics.interBurstInterval.median)} unit=" s" tooltip={TIPS.medIBI} />
              </MetricCard>
            </Grid>
          </Grid>
        </section>
      ))}
    </div>
  );
};

export default NeuralResults;

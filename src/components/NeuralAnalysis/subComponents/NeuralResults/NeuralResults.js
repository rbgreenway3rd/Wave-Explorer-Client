import React from "react";
import { Grid, Divider } from "@mui/material";
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

const NeuralResults = () => {
  const { selectedWell } = useNeuralSelection();
  const { roiList } = useNeuralInteraction();
  const { pipelineResults } = useNeuralResults();
  const peakResults = pipelineResults.spikeResults;
  const burstResults = pipelineResults.burstResults;
  const processedSignal = pipelineResults.processedSignal;
  const calculateSpikeFrequency = (spikes, startTime, endTime) => {
    const spikesInRange = spikes.filter(
      (spike) => spike.time >= startTime && spike.time <= endTime
    );
    const duration = endTime - startTime;
    const total = spikesInRange.length;
    const spikesPerSecond = duration > 0 ? total / (duration / 1000) : 0;
    return {
      total,
      average: spikesPerSecond,
      median: spikesPerSecond,
      spikesPerSecond,
    };
  };

  const calculateSpikeAmplitude = (spikes, startTime, endTime) => {
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

  const calculateSpikeWidth = (spikes, startTime, endTime) => {
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

  const calculateSpikeAUC = (spikes, startTime, endTime) => {
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

  const calculateMaxSpikeSignal = (spikes, startTime, endTime) => {
    const spikesInRange = spikes.filter(
      (spike) => spike.time >= startTime && spike.time <= endTime
    );
    if (spikesInRange.length === 0) return 0;
    const { max } = minMaxOf(spikesInRange, (s) => s.peakCoords.y);
    return max;
  };

  const calculateBurstMetrics = (bursts, startTime, endTime) => {
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

  // Calculate metrics for each ROI
  const roiMetrics = React.useMemo(() => {
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

  const formatNumber = (num, decimals = 2) => {
    if (typeof num !== "number" || isNaN(num)) return "0.00";
    return num.toFixed(decimals);
  };

  const formatHistogram = (histogram) => {
    if (!histogram || Object.keys(histogram).length === 0) return "No data";
    return Object.entries(histogram)
      .map(([bin, count]) => `${bin}: ${count}`)
      .join(", ");
  };

  const MetricCard = ({ title, children }) => (
    <Panel variant="dark" className="neural-result-card">
      <h6 className="neural-result-card__title">{title}</h6>
      {children}
    </Panel>
  );

  const MetricItem = ({ label, value, unit = "" }) => (
    <div className="neural-result-item">
      {label}:{" "}
      <span className="neural-result-item__value">
        {value}
        {unit}
      </span>
    </div>
  );

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
  const overallMetrics = React.useMemo(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peakResults, burstResults, processedSignal]);

  return (
    <div className="neural-results">
      <h6 className="neural-results__well-title">
        Analysis Results - {selectedWell?.key || "Unknown Well"}
      </h6>

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
                <MetricItem label="Total Spikes" value={overallMetrics.spikeFrequency.total} />
                <MetricItem label="Average Frequency" value={formatNumber(overallMetrics.spikeFrequency.average)} unit=" Hz" />
                <MetricItem label="Spikes Per Second" value={formatNumber(overallMetrics.spikeFrequency.spikesPerSecond)} unit=" Hz" />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Amplitude">
                <MetricItem label="Average Amplitude" value={formatNumber(overallMetrics.spikeAmplitude.average)} />
                <MetricItem label="Median Amplitude" value={formatNumber(overallMetrics.spikeAmplitude.median)} />
                <MetricItem label="Min Amplitude" value={formatNumber(overallMetrics.spikeAmplitude.min)} />
                <MetricItem label="Max Amplitude" value={formatNumber(overallMetrics.spikeAmplitude.max)} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Width">
                <MetricItem label="Average Width" value={formatNumber(overallMetrics.spikeWidth.average)} unit=" samples" />
                <MetricItem label="Median Width" value={formatNumber(overallMetrics.spikeWidth.median)} unit=" samples" />
                <MetricItem label="Min Width" value={formatNumber(overallMetrics.spikeWidth.min)} unit=" samples" />
                <MetricItem label="Max Width" value={formatNumber(overallMetrics.spikeWidth.max)} unit=" samples" />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike AUC">
                <MetricItem label="Average AUC" value={formatNumber(overallMetrics.spikeAUC.average)} />
                <MetricItem label="Median AUC" value={formatNumber(overallMetrics.spikeAUC.median)} />
                <MetricItem label="Min AUC" value={formatNumber(overallMetrics.spikeAUC.min)} />
                <MetricItem label="Max AUC" value={formatNumber(overallMetrics.spikeAUC.max)} />
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Max Spike Signal">
                <MetricItem label="Max Spike Signal" value={formatNumber(overallMetrics.maxSpikeSignal)} />
              </MetricCard>
            </Grid>

            {overallMetrics.burstMetrics.total > 0 && (
              <Grid item xs={12}>
                <MetricCard title="Burst Metrics">
                  <MetricItem label="Total Bursts" value={overallMetrics.burstMetrics.total} />
                  <Divider className="neural-result-card__divider" />
                  <h6 className="neural-result-card__subtitle">Burst Duration</h6>
                  <MetricItem label="Average Duration" value={formatNumber(overallMetrics.burstMetrics.duration.average)} unit=" ms" />
                  <MetricItem label="Median Duration" value={formatNumber(overallMetrics.burstMetrics.duration.median)} unit=" ms" />

                  <Divider className="neural-result-card__divider" />
                  <h6 className="neural-result-card__subtitle">Inter-Burst Interval</h6>
                  <MetricItem label="Average IBI" value={formatNumber(overallMetrics.burstMetrics.interBurstInterval.average)} unit=" ms" />
                  <MetricItem label="Median IBI" value={formatNumber(overallMetrics.burstMetrics.interBurstInterval.median)} unit=" ms" />
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
                <MetricItem label="Total Spikes" value={metrics.spikeFrequency.total} />
                <MetricItem label="Average Frequency" value={formatNumber(metrics.spikeFrequency.average)} unit=" Hz" />
                <MetricItem label="Median Frequency" value={formatNumber(metrics.spikeFrequency.median)} unit=" Hz" />
                <div className="neural-result-card__caption">
                  Histogram: {formatHistogram(metrics.spikeFrequency.histogram)}
                </div>
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Amplitude">
                <MetricItem label="Average Amplitude" value={formatNumber(metrics.spikeAmplitude.average)} />
                <MetricItem label="Median Amplitude" value={formatNumber(metrics.spikeAmplitude.median)} />
                <MetricItem label="Min Amplitude" value={formatNumber(metrics.spikeAmplitude.min)} />
                <MetricItem label="Max Amplitude" value={formatNumber(metrics.spikeAmplitude.max)} />
                <div className="neural-result-card__caption">
                  Histogram: {formatHistogram(metrics.spikeAmplitude.histogram)}
                </div>
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Width">
                <MetricItem label="Average Width" value={formatNumber(metrics.spikeWidth.average)} unit=" samples" />
                <MetricItem label="Median Width" value={formatNumber(metrics.spikeWidth.median)} unit=" samples" />
                <div className="neural-result-card__caption">
                  Histogram: {formatHistogram(metrics.spikeWidth.histogram)}
                </div>
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike AUC">
                <MetricItem label="Average AUC" value={formatNumber(metrics.spikeAUC.average)} />
                <MetricItem label="Median AUC" value={formatNumber(metrics.spikeAUC.median)} />
                <div className="neural-result-card__caption">
                  Histogram: {formatHistogram(metrics.spikeAUC.histogram)}
                </div>
              </MetricCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard title="Max Spike Signal">
                <MetricItem label="Max Spike Signal" value={formatNumber(metrics.maxSpikeSignal)} />
              </MetricCard>
            </Grid>
            <Grid item xs={12}>
              <MetricCard title="Burst Metrics">
                <MetricItem label="Total Bursts" value={metrics.burstMetrics.total} />
                <Divider className="neural-result-card__divider" />
                <h6 className="neural-result-card__subtitle">Burst Duration</h6>
                <MetricItem label="Average Duration" value={formatNumber(metrics.burstMetrics.duration.average)} unit=" ms" />
                <MetricItem label="Median Duration" value={formatNumber(metrics.burstMetrics.duration.median)} unit=" ms" />
                <div className="neural-result-card__caption">
                  Duration Histogram: {formatHistogram(metrics.burstMetrics.duration.histogram)}
                </div>

                <Divider className="neural-result-card__divider" />
                <h6 className="neural-result-card__subtitle">Inter-Burst Interval</h6>
                <MetricItem label="Average IBI" value={formatNumber(metrics.burstMetrics.interBurstInterval.average)} unit=" ms" />
                <MetricItem label="Median IBI" value={formatNumber(metrics.burstMetrics.interBurstInterval.median)} unit=" ms" />
                <div className="neural-result-card__caption">
                  IBI Histogram: {formatHistogram(metrics.burstMetrics.interBurstInterval.histogram)}
                </div>
              </MetricCard>
            </Grid>
          </Grid>
        </section>
      ))}
    </div>
  );
};

export default NeuralResults;

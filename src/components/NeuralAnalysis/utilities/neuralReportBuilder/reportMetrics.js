// Single source of truth for per-well numeric helpers in the report
// builder. Both Single-Well and Full-Plate import from here, ensuring
// the same well analyzed by either path produces identical numbers.
//
// Signature philosophy: rate metrics take an explicit `{startTime,
// endTime}` window for their denominator; distributional metrics
// (amplitude/width/AUC/max signal) take only the spike array. Callers
// pre-filter the array by ROI scope (via `roiScoping.js`) before
// calling. Filtering inside the helper was the source of the divergence
// between the two report files and is intentionally removed here.

/**
 * Round metric values to integers per the established project
 * convention (Dave Weaver, 2026-05-27). Frequencies (Hz) need sub-
 * integer precision because typical spike rates are < 1 Hz; callers
 * pass decimals=2 for those.
 *
 * @param {number} num
 * @param {number} [decimals=0]
 * @returns {string} "N/A" for null/NaN, otherwise the rounded number.
 */
export function formatMetric(num, decimals = 0) {
  if (num == null || Number.isNaN(num)) return "N/A";
  return decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
}

function medianSorted(sorted) {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Spike frequency / ISI metrics. Requires an explicit window because
 * spikesPerSecond divides by `(endTime - startTime)` — deriving the
 * window from spike times themselves would wildly inflate the rate
 * when spikes are clustered in a small fraction of the recording.
 *
 * @param {Array<{time: number}>} spikes pre-filtered to the ROI/well
 * @param {{startTime: number, endTime: number}} window
 */
export function calculateSpikeFrequency(spikes, { startTime, endTime }) {
  const duration = endTime - startTime;
  const total = spikes.length;
  const spikesPerSecond = duration > 0 ? total / duration : 0;
  let averageFrequency = 0;
  let medianFrequency = 0;
  let meanIsi = 0;
  let medianIsi = 0;
  if (total >= 2) {
    const sortedTimes = spikes.map((s) => s.time).sort((a, b) => a - b);
    const isis = new Array(sortedTimes.length - 1);
    for (let i = 1; i < sortedTimes.length; i++) {
      isis[i - 1] = sortedTimes[i] - sortedTimes[i - 1];
    }
    meanIsi = isis.reduce((sum, v) => sum + v, 0) / isis.length;
    const sortedIsis = [...isis].sort((a, b) => a - b);
    medianIsi = medianSorted(sortedIsis);
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
}

/**
 * Spike amplitude distribution. Distributional — no window needed.
 * @param {Array<{amplitude: number}>} spikes pre-filtered
 */
export function calculateSpikeAmplitude(spikes) {
  if (!Array.isArray(spikes) || spikes.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }
  const amplitudes = spikes.map((spike) => spike.amplitude);
  const sum = amplitudes.reduce((acc, amp) => acc + amp, 0);
  const sorted = [...amplitudes].sort((a, b) => a - b);
  return {
    average: sum / amplitudes.length,
    median: medianSorted(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Spike width distribution. Distributional — no window needed.
 * @param {Array<{width: number}>} spikes pre-filtered; non-numeric
 * widths are skipped.
 */
export function calculateSpikeWidth(spikes) {
  if (!Array.isArray(spikes) || spikes.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }
  const widths = spikes
    .map((spike) => spike.width)
    .filter((w) => typeof w === "number");
  if (widths.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }
  const sum = widths.reduce((acc, w) => acc + w, 0);
  const sorted = [...widths].sort((a, b) => a - b);
  return {
    average: sum / widths.length,
    median: medianSorted(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Spike AUC distribution. Distributional — no window needed.
 * @param {Array<{auc: number}>} spikes pre-filtered; non-numeric AUCs
 * are skipped.
 */
export function calculateSpikeAUC(spikes) {
  if (!Array.isArray(spikes) || spikes.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }
  const aucs = spikes
    .map((spike) => spike.auc)
    .filter((a) => typeof a === "number");
  if (aucs.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }
  const sum = aucs.reduce((acc, a) => acc + a, 0);
  const sorted = [...aucs].sort((a, b) => a - b);
  return {
    average: sum / aucs.length,
    median: medianSorted(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Maximum spike apex (peakCoords.y) over the pre-filtered spike set.
 * Returns 0 when the array is empty so downstream rows render as
 * "0" rather than "N/A".
 * @param {Array<{peakCoords: {y: number}}>} spikes pre-filtered
 */
export function calculateMaxSpikeSignal(spikes) {
  if (!Array.isArray(spikes) || spikes.length === 0) return 0;
  let maxY = -Infinity;
  for (const spike of spikes) {
    const y = spike?.peakCoords?.y;
    if (typeof y === "number" && y > maxY) maxY = y;
  }
  return maxY === -Infinity ? 0 : maxY;
}

/**
 * Burst aggregate metrics. Takes the window for parity with the rate
 * metrics — a future `burstsPerSecond` field would land here — even
 * though no current field divides by it. The caller is responsible
 * for pre-filtering the burst array to the ROI scope.
 *
 * @param {Array<{startTime: number, endTime: number, duration: number}>} bursts pre-filtered
 * @param {{startTime: number, endTime: number}} _window currently unused; reserved.
 */
export function calculateBurstMetrics(bursts, _window) {
  if (!Array.isArray(bursts) || bursts.length === 0) {
    return {
      total: 0,
      duration: { average: 0, median: 0 },
      interBurstInterval: { average: 0, median: 0 },
    };
  }

  const durations = bursts.map((burst) => burst.duration);
  const sumDuration = durations.reduce((s, d) => s + d, 0);
  const sortedDurations = [...durations].sort((a, b) => a - b);

  // Inter-burst intervals: positive gap between consecutive bursts.
  // Bursts are already pre-filtered AND should be sorted by startTime
  // by the time they reach here, but we don't enforce — we just guard
  // against negative gaps (which can happen if an upstream pass left
  // them unsorted or overlapping).
  const interBurstIntervals = [];
  for (let i = 1; i < bursts.length; i++) {
    const interval = bursts[i].startTime - bursts[i - 1].endTime;
    if (interval > 0) interBurstIntervals.push(interval);
  }

  let avgIBI = 0;
  let medianIBI = 0;
  if (interBurstIntervals.length > 0) {
    const sumIBI = interBurstIntervals.reduce((s, v) => s + v, 0);
    avgIBI = sumIBI / interBurstIntervals.length;
    const sortedIBIs = [...interBurstIntervals].sort((a, b) => a - b);
    medianIBI = medianSorted(sortedIBIs);
  }

  return {
    total: bursts.length,
    duration: {
      average: sumDuration / durations.length,
      median: medianSorted(sortedDurations),
    },
    interBurstInterval: { average: avgIBI, median: medianIBI },
  };
}

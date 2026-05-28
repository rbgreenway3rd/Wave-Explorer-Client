/**
 * Burst detection utility for WaveExplorer Neural Analysis
 * Identifies bursts as rapid successions of spikes followed by quiet periods.
 *
 * After Tier G6d this is a single linear sweep over time-sorted spikes
 * — drops the previous O(n²) DBSCAN with `.includes()` linear seed
 * search. The user-facing semantic ("a burst is a maximal run of
 * spikes whose consecutive inter-spike intervals are all ≤
 * maxInterSpikeInterval, with at least minSpikesPerBurst members")
 * is locked by the Tier D tests under __tests__/detectBursts.test.js.
 */

// Class to encapsulate a detected neural burst
export class NeuralBurst {
  constructor(
    startIndex,
    endIndex,
    spikeIndices,
    startTime,
    endTime,
    duration,
    spikeCount,
    interBurstInterval
  ) {
    this.startIndex = startIndex; // Index of first spike in burst
    this.endIndex = endIndex; // Index of last spike in burst
    this.spikeIndices = spikeIndices; // Array of spike indices in this burst
    this.startTime = startTime; // Time of first spike
    this.endTime = endTime; // Time of last spike
    this.duration = duration; // Duration of burst (endTime - startTime)
    this.spikeCount = spikeCount; // Number of spikes in burst
    this.interBurstInterval = interBurstInterval; // Time to next burst (null for last)
  }
}

/**
 * Detect bursts in a sequence of neural spikes.
 *
 * @param {NeuralPeak[]} peaks - Array of detected neural spikes
 * @param {Object} options
 * @param {number} [options.maxInterSpikeInterval=0.05] - Max time between
 *        consecutive spikes (in seconds) for them to be considered same burst
 * @param {number} [options.minSpikesPerBurst=3] - Minimum spike count
 * @returns {NeuralBurst[]}
 */
export function detectBursts(peaks, options = {}) {
  const maxIsi = options.dbscanEps ?? options.maxInterSpikeInterval ?? 0.05;
  const minSpikesPerBurst = options.minSpikesPerBurst ?? 3;
  if (!Array.isArray(peaks) || peaks.length < minSpikesPerBurst) return [];

  // Sort peaks by time. The pipeline already produces time-sorted spikes,
  // but defensive sort here keeps this function safe for direct callers
  // (e.g. tests passing unsorted input).
  const sortedPeaks = [...peaks].sort(
    (a, b) => a.peakCoords.x - b.peakCoords.x
  );

  const bursts = [];
  let lastBurstEndTime = null;

  // Linear sweep — accumulate consecutive spikes into the current run;
  // when the gap exceeds maxIsi (or we hit the end), close the run and
  // emit a NeuralBurst if it has ≥ minSpikesPerBurst members.
  let runStart = 0;

  function emitRun(startIncl, endIncl) {
    const count = endIncl - startIncl + 1;
    if (count < minSpikesPerBurst) return;
    const startPeak = sortedPeaks[startIncl];
    const endPeak = sortedPeaks[endIncl];
    const startTime = startPeak.peakCoords.x;
    const endTime = endPeak.peakCoords.x;
    const spikeIndices = new Array(count);
    for (let k = 0; k < count; k++) {
      spikeIndices[k] = sortedPeaks[startIncl + k].index;
    }
    const interBurstInterval =
      lastBurstEndTime !== null ? startTime - lastBurstEndTime : null;
    bursts.push(
      new NeuralBurst(
        startPeak.index,
        endPeak.index,
        spikeIndices,
        startTime,
        endTime,
        endTime - startTime,
        count,
        interBurstInterval
      )
    );
    lastBurstEndTime = endTime;
  }

  for (let i = 1; i < sortedPeaks.length; i++) {
    const isi = sortedPeaks[i].peakCoords.x - sortedPeaks[i - 1].peakCoords.x;
    if (isi > maxIsi) {
      emitRun(runStart, i - 1);
      runStart = i;
    }
  }
  // Close the final run.
  emitRun(runStart, sortedPeaks.length - 1);

  return bursts;
}

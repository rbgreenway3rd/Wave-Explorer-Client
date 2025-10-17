/**
 * Burst detection utility for WaveExplorer Neural Analysis
 * Identifies bursts as rapid successions of spikes followed by quiet periods.
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
 * DBSCAN clustering for 1D spike times.
 * @param {number[]} times - Array of spike times
 * @param {number} eps - Maximum time gap for points to be in the same cluster
 * @param {number} minPts - Minimum number of points to form a cluster
 * @returns {number[][]} Array of clusters (each is an array of indices into times)
 */
function dbscan1D(times, eps, minPts) {
  const n = times.length;
  const visited = new Array(n).fill(false);
  const clustered = new Array(n).fill(false);
  const clusters = [];

  function regionQuery(idx) {
    const neighbors = [];
    for (let j = 0; j < n; j++) {
      if (Math.abs(times[j] - times[idx]) <= eps) {
        neighbors.push(j);
      }
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const neighbors = regionQuery(i);
    if (neighbors.length < minPts) {
      // Noise, do nothing
      continue;
    }
    // Start a new cluster
    const cluster = [];
    const seeds = [...neighbors];
    for (let k = 0; k < seeds.length; k++) {
      const j = seeds[k];
      if (!visited[j]) {
        visited[j] = true;
        const neighbors2 = regionQuery(j);
        if (neighbors2.length >= minPts) {
          for (const nidx of neighbors2) {
            if (!seeds.includes(nidx)) seeds.push(nidx);
          }
        }
      }
      if (!clustered[j]) {
        cluster.push(j);
        clustered[j] = true;
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

/**
 * Detect bursts in a sequence of neural spikes.
 * A burst is defined as a group of spikes with inter-spike intervals below a threshold,
 * containing at least a minimum number of spikes.
 *
 * @param {NeuralPeak[]} peaks - Array of detected neural spikes
 * @param {Object} options - Configuration options
 * @param {number} [options.maxInterSpikeInterval=50] - Maximum time between spikes to be in same burst (in same units as x)
 * @param {number} [options.minSpikesPerBurst=3] - Minimum number of spikes to form a burst
 * @returns {NeuralBurst[]} Array of detected bursts
 */
export function detectBursts(peaks, options = {}) {
  // --- DBSCAN logic ---
  const dbscanEps = options.dbscanEps ?? options.maxInterSpikeInterval ?? 50;
  const minSpikesPerBurst = options.minSpikesPerBurst ?? 3;
  if (!Array.isArray(peaks) || peaks.length < minSpikesPerBurst) return [];
  // Sort peaks by time
  const sortedPeaks = [...peaks].sort(
    (a, b) => a.peakCoords.x - b.peakCoords.x
  );
  const times = sortedPeaks.map((p) => p.peakCoords.x);
  const indices = sortedPeaks.map((p) => p.index);
  // Run DBSCAN
  const clusters = dbscan1D(times, dbscanEps, minSpikesPerBurst);
  // Build NeuralBurst objects
  const bursts = [];
  let lastBurstEndTime = null;
  for (const cluster of clusters) {
    if (cluster.length < minSpikesPerBurst) continue;
    const clusterIndices = cluster.sort((a, b) => times[a] - times[b]);
    const startIdx = indices[clusterIndices[0]];
    const endIdx = indices[clusterIndices[clusterIndices.length - 1]];
    const spikeIndices = clusterIndices.map((i) => indices[i]);
    const startTime = times[clusterIndices[0]];
    const endTime = times[clusterIndices[clusterIndices.length - 1]];
    const duration = endTime - startTime;
    const spikeCount = cluster.length;
    const interBurstInterval =
      lastBurstEndTime !== null ? startTime - lastBurstEndTime : null;
    bursts.push(
      new NeuralBurst(
        startIdx,
        endIdx,
        spikeIndices,
        startTime,
        endTime,
        duration,
        spikeCount,
        interBurstInterval
      )
    );
    lastBurstEndTime = endTime;
  }
  return bursts;
}

import React from "react";
import { Box, Typography, Paper, Grid, Divider } from "@mui/material";

const NeuralResults = ({
  peakResults,
  burstResults,
  roiList,
  selectedWell,
}) => {
  // Helper functions for metrics calculation
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
      median: spikesPerSecond, // For single value, median = average
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
    const average =
      amplitudes.reduce((sum, amp) => sum + amp, 0) / amplitudes.length;
    const sortedAmplitudes = [...amplitudes].sort((a, b) => a - b);
    const median =
      sortedAmplitudes.length % 2 === 0
        ? (sortedAmplitudes[sortedAmplitudes.length / 2 - 1] +
            sortedAmplitudes[sortedAmplitudes.length / 2]) /
          2
        : sortedAmplitudes[Math.floor(sortedAmplitudes.length / 2)];

    return {
      average,
      median,
      min: Math.min(...amplitudes),
      max: Math.max(...amplitudes),
    };
  };

  const calculateSpikeWidth = (spikes, startTime, endTime) => {
    const spikesInRange = spikes.filter(
      (spike) => spike.time >= startTime && spike.time <= endTime && spike.width
    );
    if (spikesInRange.length === 0) {
      return { average: 0, median: 0, min: 0, max: 0 };
    }

    const widths = spikesInRange.map((spike) => spike.width);
    const average = widths.reduce((sum, w) => sum + w, 0) / widths.length;
    const sortedWidths = [...widths].sort((a, b) => a - b);
    const median =
      sortedWidths.length % 2 === 0
        ? (sortedWidths[sortedWidths.length / 2 - 1] +
            sortedWidths[sortedWidths.length / 2]) /
          2
        : sortedWidths[Math.floor(sortedWidths.length / 2)];

    return {
      average,
      median,
      min: Math.min(...widths),
      max: Math.max(...widths),
    };
  };

  const calculateSpikeAUC = (spikes, startTime, endTime) => {
    const spikesInRange = spikes.filter(
      (spike) => spike.time >= startTime && spike.time <= endTime && spike.auc
    );
    if (spikesInRange.length === 0) {
      return { average: 0, median: 0, min: 0, max: 0 };
    }

    const aucs = spikesInRange.map((spike) => spike.auc);
    const average = aucs.reduce((sum, auc) => sum + auc, 0) / aucs.length;
    const sortedAUCs = [...aucs].sort((a, b) => a - b);
    const median =
      sortedAUCs.length % 2 === 0
        ? (sortedAUCs[sortedAUCs.length / 2 - 1] +
            sortedAUCs[sortedAUCs.length / 2]) /
          2
        : sortedAUCs[Math.floor(sortedAUCs.length / 2)];

    return {
      average,
      median,
      min: Math.min(...aucs),
      max: Math.max(...aucs),
    };
  };

  const calculateMaxSpikeSignal = (spikes, startTime, endTime) => {
    const spikesInRange = spikes.filter(
      (spike) => spike.time >= startTime && spike.time <= endTime
    );
    if (spikesInRange.length === 0) {
      return 0;
    }

    const maxSignal = Math.max(
      ...spikesInRange.map((spike) => spike.peakCoords.y)
    );
    return maxSignal;
  };

  const calculateBurstMetrics = (bursts, startTime, endTime) => {
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

    // Calculate durations
    const durations = burstsInRange.map((burst) => burst.duration);
    const avgDuration =
      durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const medianDuration =
      sortedDurations.length % 2 === 0
        ? (sortedDurations[sortedDurations.length / 2 - 1] +
            sortedDurations[sortedDurations.length / 2]) /
          2
        : sortedDurations[Math.floor(sortedDurations.length / 2)];

    // Calculate inter-burst intervals
    const interBurstIntervals = [];
    for (let i = 1; i < burstsInRange.length; i++) {
      const interval =
        burstsInRange[i].startTime - burstsInRange[i - 1].endTime;
      if (interval > 0) interBurstIntervals.push(interval);
    }

    let avgIBI = 0;
    let medianIBI = 0;
    if (interBurstIntervals.length > 0) {
      avgIBI =
        interBurstIntervals.reduce((sum, ibi) => sum + ibi, 0) /
        interBurstIntervals.length;
      const sortedIBIs = [...interBurstIntervals].sort((a, b) => a - b);
      medianIBI =
        sortedIBIs.length % 2 === 0
          ? (sortedIBIs[sortedIBIs.length / 2 - 1] +
              sortedIBIs[sortedIBIs.length / 2]) /
            2
          : sortedIBIs[Math.floor(sortedIBIs.length / 2)];
    }

    return {
      total: burstsInRange.length,
      duration: { average: avgDuration, median: medianDuration },
      interBurstInterval: { average: avgIBI, median: medianIBI },
    };
  };

  // Calculate metrics for each ROI
  const roiMetrics = React.useMemo(() => {
    if (!Array.isArray(roiList) || roiList.length === 0) return {};

    console.log("NeuralResults - roiList:", roiList);
    console.log("NeuralResults - peakResults:", peakResults);
    console.log("NeuralResults - burstResults:", burstResults);

    const metrics = {};
    roiList.forEach((roi, index) => {
      if (roi && roi.xMin !== undefined && roi.xMax !== undefined) {
        console.log(`ROI ${index + 1}: xMin=${roi.xMin}, xMax=${roi.xMax}`);

        const spikesInROI = peakResults.filter(
          (spike) => spike.time >= roi.xMin && spike.time <= roi.xMax
        );
        const burstsInROI = burstResults.filter(
          (burst) => burst.startTime >= roi.xMin && burst.endTime <= roi.xMax
        );

        console.log(`ROI ${index + 1} - spikesInROI:`, spikesInROI);
        console.log(`ROI ${index + 1} - burstsInROI:`, burstsInROI);

        // Check if ROI has any data
        const hasData = spikesInROI.length > 0 || burstsInROI.length > 0;
        if (!hasData) {
          console.warn(
            `ROI ${
              index + 1
            } contains no detected spikes or bursts. Try defining the ROI in a different time range.`
          );
        }

        metrics[`ROI ${index + 1}`] = {
          spikeFrequency: calculateSpikeFrequency(
            spikesInROI,
            roi.xMin,
            roi.xMax
          ),
          spikeAmplitude: calculateSpikeAmplitude(
            spikesInROI,
            roi.xMin,
            roi.xMax
          ),
          spikeWidth: calculateSpikeWidth(spikesInROI, roi.xMin, roi.xMax),
          spikeAUC: calculateSpikeAUC(spikesInROI, roi.xMin, roi.xMax),
          maxSpikeSignal: calculateMaxSpikeSignal(
            spikesInROI,
            roi.xMin,
            roi.xMax
          ),
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
    <Paper
      elevation={2}
      sx={{ p: 2, mb: 2, backgroundColor: "#333", color: "white" }}
    >
      <Typography variant="h6" gutterBottom sx={{ color: "#00bcd4" }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );

  const MetricItem = ({ label, value, unit = "" }) => (
    <Box sx={{ mb: 1 }}>
      <Typography variant="body2" sx={{ color: "#ccc" }}>
        {label}:{" "}
        <span style={{ color: "#fff", fontWeight: "bold" }}>
          {value}
          {unit}
        </span>
      </Typography>
    </Box>
  );

  if (Object.keys(roiMetrics).length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="white" gutterBottom>
          Analysis Results
        </Typography>
        <Paper
          elevation={2}
          sx={{ p: 2, backgroundColor: "#333", color: "white" }}
        >
          <Typography>
            No ROIs defined. Please define regions of interest to see metrics.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxHeight: "600px", overflowY: "auto" }}>
      <Typography variant="h6" color="white" gutterBottom>
        Analysis Results - {selectedWell?.key || "Unknown Well"}
      </Typography>

      {Object.entries(roiMetrics).map(([roiName, metrics]) => (
        <Box key={roiName} sx={{ mb: 3 }}>
          <Typography variant="h5" color="#00bcd4" gutterBottom>
            {roiName}
          </Typography>

          <Grid container spacing={2}>
            {/* Spike Frequency */}
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Frequency">
                <MetricItem
                  label="Total Spikes"
                  value={metrics.spikeFrequency.total}
                />
                <MetricItem
                  label="Average Frequency"
                  value={formatNumber(metrics.spikeFrequency.average)}
                  unit=" Hz"
                />
                <MetricItem
                  label="Median Frequency"
                  value={formatNumber(metrics.spikeFrequency.median)}
                  unit=" Hz"
                />
                <Typography variant="body2" sx={{ color: "#ccc", mt: 1 }}>
                  Histogram: {formatHistogram(metrics.spikeFrequency.histogram)}
                </Typography>
              </MetricCard>
            </Grid>

            {/* Spike Amplitude */}
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Amplitude">
                <MetricItem
                  label="Average Amplitude"
                  value={formatNumber(metrics.spikeAmplitude.average)}
                />
                <MetricItem
                  label="Median Amplitude"
                  value={formatNumber(metrics.spikeAmplitude.median)}
                />
                <MetricItem
                  label="Min Amplitude"
                  value={formatNumber(metrics.spikeAmplitude.min)}
                />
                <MetricItem
                  label="Max Amplitude"
                  value={formatNumber(metrics.spikeAmplitude.max)}
                />
                <Typography variant="body2" sx={{ color: "#ccc", mt: 1 }}>
                  Histogram: {formatHistogram(metrics.spikeAmplitude.histogram)}
                </Typography>
              </MetricCard>
            </Grid>

            {/* Spike Width */}
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike Width">
                <MetricItem
                  label="Average Width"
                  value={formatNumber(metrics.spikeWidth.average)}
                  unit=" samples"
                />
                <MetricItem
                  label="Median Width"
                  value={formatNumber(metrics.spikeWidth.median)}
                  unit=" samples"
                />
                <Typography variant="body2" sx={{ color: "#ccc", mt: 1 }}>
                  Histogram: {formatHistogram(metrics.spikeWidth.histogram)}
                </Typography>
              </MetricCard>
            </Grid>

            {/* Spike AUC */}
            <Grid item xs={12} md={6}>
              <MetricCard title="Spike AUC">
                <MetricItem
                  label="Average AUC"
                  value={formatNumber(metrics.spikeAUC.average)}
                />
                <MetricItem
                  label="Median AUC"
                  value={formatNumber(metrics.spikeAUC.median)}
                />
                <Typography variant="body2" sx={{ color: "#ccc", mt: 1 }}>
                  Histogram: {formatHistogram(metrics.spikeAUC.histogram)}
                </Typography>
              </MetricCard>
            </Grid>

            {/* Max Spike Signal */}
            <Grid item xs={12} md={6}>
              <MetricCard title="Max Spike Signal">
                <MetricItem
                  label="Max Spike Signal"
                  value={formatNumber(metrics.maxSpikeSignal)}
                />
              </MetricCard>
            </Grid>

            {/* Burst Metrics */}
            <Grid item xs={12}>
              <MetricCard title="Burst Metrics">
                <MetricItem
                  label="Total Bursts"
                  value={metrics.burstMetrics.total}
                />
                <Divider sx={{ my: 2, backgroundColor: "#555" }} />
                <Typography
                  variant="subtitle1"
                  sx={{ color: "#00bcd4", mb: 1 }}
                >
                  Burst Duration
                </Typography>
                <MetricItem
                  label="Average Duration"
                  value={formatNumber(metrics.burstMetrics.duration.average)}
                  unit=" ms"
                />
                <MetricItem
                  label="Median Duration"
                  value={formatNumber(metrics.burstMetrics.duration.median)}
                  unit=" ms"
                />
                <Typography
                  variant="body2"
                  sx={{ color: "#ccc", mt: 1, mb: 2 }}
                >
                  Duration Histogram:{" "}
                  {formatHistogram(metrics.burstMetrics.duration.histogram)}
                </Typography>

                <Divider sx={{ my: 2, backgroundColor: "#555" }} />
                <Typography
                  variant="subtitle1"
                  sx={{ color: "#00bcd4", mb: 1 }}
                >
                  Inter-Burst Interval
                </Typography>
                <MetricItem
                  label="Average IBI"
                  value={formatNumber(
                    metrics.burstMetrics.interBurstInterval.average
                  )}
                  unit=" ms"
                />
                <MetricItem
                  label="Median IBI"
                  value={formatNumber(
                    metrics.burstMetrics.interBurstInterval.median
                  )}
                  unit=" ms"
                />
                <Typography variant="body2" sx={{ color: "#ccc", mt: 1 }}>
                  IBI Histogram:{" "}
                  {formatHistogram(
                    metrics.burstMetrics.interBurstInterval.histogram
                  )}
                </Typography>
              </MetricCard>
            </Grid>
          </Grid>
        </Box>
      ))}
    </Box>
  );
};

export default NeuralResults;

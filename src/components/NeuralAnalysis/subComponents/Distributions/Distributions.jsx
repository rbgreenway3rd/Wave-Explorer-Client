import React, { useMemo } from "react";
import { useNeuralResults, useNeuralSettings } from "../../NeuralProvider";
import Histogram from "./Histogram";
import { binWithFreedmanDiaconis, deriveISIs } from "./binning";
import "./Distributions.css";

/**
 * Distributions — four small stacked histograms for the currently
 * selected well. Lives in a CollapsibleSection in the modal's right
 * column. Sources:
 *
 *   Prominence  candidate distribution emitted by the worker (every
 *               local maximum's detection prominence, unbiased). The
 *               threshold line follows the prominence slider live via
 *               the draft state already published by useDraftSlider.
 *
 *   ISI         derived from sorted spike times in the kept-spike
 *               array. Bins in log10 space because ISIs span 4 orders
 *               of magnitude.
 *
 *   Amplitude   from `pk.peakCoords.y` over kept spikes.
 *
 *   Width       from `pk.width` over kept spikes. Threshold line at
 *               `spikeMinWidth`.
 *
 * Future Phase 2 will add a "Plate" tab to this section — the
 * `<Histogram>` primitive accepts a `marker` prop for highlighting the
 * selected well's value among the plate distribution.
 */

// Tight numeric formatters scaled to each domain.
const fmtAmplitude = (v) => {
  const a = Math.abs(v);
  if (a < 0.01) return v.toFixed(5);
  if (a < 1) return v.toFixed(3);
  if (a < 100) return v.toFixed(2);
  return v.toFixed(0);
};

const fmtProminence = fmtAmplitude;

const fmtIsiSeconds = (v) => {
  if (v < 0.01) return `${(v * 1000).toFixed(1)} ms`;
  if (v < 1) return `${(v * 1000).toFixed(0)} ms`;
  if (v < 60) return `${v.toFixed(2)} s`;
  return `${(v / 60).toFixed(1)} min`;
};

const fmtSamples = (v) => `${Math.round(v)}`;

const Distributions = () => {
  const { pipelineResults } = useNeuralResults();
  const {
    effectiveSpikeProminence,
    spikeMinWidth,
    maxInterSpikeInterval,
    draftSpikeProminence,
  } = useNeuralSettings();

  const spikes = pipelineResults?.spikeResults;
  const promHist = pipelineResults?.candidateDistributions?.prominence;

  // Prominence: pre-binned by the worker (unbiased over all local
  // maxima). The draft slot lets the threshold line track the slider
  // thumb during drag; falls back to the committed effective value
  // when no drag is in progress.
  const promThreshold =
    typeof draftSpikeProminence === "number"
      ? draftSpikeProminence
      : effectiveSpikeProminence;

  // ISI: derive from spike times and bin in log10 space.
  const isiBins = useMemo(() => {
    const isis = deriveISIs(spikes);
    if (isis.length === 0) return null;
    return binWithFreedmanDiaconis(isis, { logScale: true });
  }, [spikes]);

  // Amplitude: peakCoords.y of every kept spike.
  const amplitudeBins = useMemo(() => {
    if (!Array.isArray(spikes) || spikes.length === 0) return null;
    const vals = new Array(spikes.length);
    for (let i = 0; i < spikes.length; i++) {
      const pk = spikes[i];
      vals[i] = pk && pk.peakCoords ? pk.peakCoords.y : NaN;
    }
    return binWithFreedmanDiaconis(vals);
  }, [spikes]);

  // Width: pk.width (samples) of every kept spike.
  const widthBins = useMemo(() => {
    if (!Array.isArray(spikes) || spikes.length === 0) return null;
    const vals = new Array(spikes.length);
    for (let i = 0; i < spikes.length; i++) vals[i] = spikes[i]?.width ?? NaN;
    return binWithFreedmanDiaconis(vals);
  }, [spikes]);

  return (
    <div className="distributions">
      <Histogram
        bins={promHist}
        threshold={promThreshold}
        title="Prominence (all candidates)"
        xFormat={fmtProminence}
        yLabel="candidates"
        emptyMessage="No candidates yet"
      />
      <Histogram
        bins={isiBins}
        threshold={maxInterSpikeInterval}
        title="Inter-spike Interval"
        xFormat={fmtIsiSeconds}
        yLabel="intervals"
        logScale
        emptyMessage="Need ≥ 2 spikes"
      />
      <Histogram
        bins={amplitudeBins}
        title="Spike Amplitude"
        xFormat={fmtAmplitude}
        yLabel="spikes"
        emptyMessage="No spikes yet"
      />
      <Histogram
        bins={widthBins}
        threshold={spikeMinWidth}
        title="Spike Width (samples)"
        xFormat={fmtSamples}
        yLabel="spikes"
        emptyMessage="No spikes yet"
      />
    </div>
  );
};

export default Distributions;

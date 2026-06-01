import React from "react";
import { Slider, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import { perf } from "../../../utilities/perfLogger";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

/**
 * BurstDetectionControls — sliders for max inter-spike interval (s)
 * and min spikes per burst. Reads burst state directly from
 * NeuralSettingsContext; sliders use useDraftSlider so dragging only
 * updates a local value and the pipeline-triggering setter fires once
 * on release.
 *
 * The ISI slider is LOG-scaled so a single control can cover the full
 * realistic burst-timescale range: 5 ms (single-unit electrophys) up
 * to 30 s (slow Ca²⁺ events on minute-long recordings sampled at a
 * few Hz). A linear 0–30 s slider would make the sub-second sub-range
 * unreachable in practice; log scale puts equal-pixel-distance =
 * equal-log-distance, so 0.01 ↔ 0.1 ↔ 1 ↔ 10 are all the same drag.
 */
const ISI_MIN_S = 0.005;
const ISI_MAX_S = 30;
const ISI_LOG_MIN = Math.log(ISI_MIN_S);
const ISI_LOG_RANGE = Math.log(ISI_MAX_S) - ISI_LOG_MIN;
// Slider internal position space — finer than 1000 isn't perceptible.
const ISI_POSITION_MAX = 1000;
const positionFromIsi = (s) => {
  if (!(s > 0)) return 0;
  const clamped = Math.max(ISI_MIN_S, Math.min(ISI_MAX_S, s));
  return Math.round(
    ((Math.log(clamped) - ISI_LOG_MIN) / ISI_LOG_RANGE) * ISI_POSITION_MAX
  );
};
const isiFromPosition = (p) => {
  const t = Math.max(0, Math.min(ISI_POSITION_MAX, p)) / ISI_POSITION_MAX;
  return Math.exp(ISI_LOG_MIN + t * ISI_LOG_RANGE);
};
// Snap to a display-friendly precision per decade so the readout
// doesn't show 1.2837492 s. Stored value also uses the snapped form
// because the burst gate is a `≤` comparison and tiny ULP noise has
// no clinical meaning here.
const snapIsi = (s) => {
  if (s < 0.01) return Math.round(s * 10000) / 10000;
  if (s < 0.1) return Math.round(s * 1000) / 1000;
  if (s < 1) return Math.round(s * 100) / 100;
  if (s < 10) return Math.round(s * 10) / 10;
  return Math.round(s);
};
const formatIsi = (s) => {
  if (s < 0.01) return s.toFixed(4);
  if (s < 0.1) return s.toFixed(3);
  if (s < 1) return s.toFixed(2);
  if (s < 10) return s.toFixed(1);
  return String(Math.round(s));
};

const BurstDetectionControls = () => {
  const {
    showBursts,
    maxInterSpikeInterval,
    setMaxInterSpikeInterval,
    minSpikesPerBurst,
    setMinSpikesPerBurst,
  } = useNeuralSettings();
  // Sensible Ca²⁺ default — the prior 0.05 s default essentially
  // disabled burst detection on slow-sampled recordings.
  const DEFAULT_MAX_INTERVAL = 1.0;
  const DEFAULT_MIN_SPIKES = 3;

  const interval = useDraftSlider(
    maxInterSpikeInterval,
    setMaxInterSpikeInterval
  );
  const minSpikes = useDraftSlider(minSpikesPerBurst, setMinSpikesPerBurst);

  const handleReset = () => {
    setMaxInterSpikeInterval(DEFAULT_MAX_INTERVAL);
    setMinSpikesPerBurst(DEFAULT_MIN_SPIKES);
  };

  // Log-scaled slider plumbing: position ↔ seconds via exponential.
  // useDraftSlider stores/commits the SECONDS value; the slider's
  // value/marks/step live in position space. Mark labels intentionally
  // round to clean log-decade anchors (0.01, 0.1, 1, 10) so the user
  // has familiar reference points.
  const intervalPosition = positionFromIsi(interval.value);
  const handleIntervalChange = (e, position) => {
    perf.count("slider.maxInterSpikeInterval");
    const seconds = snapIsi(isiFromPosition(position));
    interval.onChange(e, seconds);
  };
  const handleIntervalCommitted = (e, position) => {
    const seconds = snapIsi(isiFromPosition(position));
    interval.onChangeCommitted(e, seconds);
  };
  const intervalMarks = [
    { value: positionFromIsi(0.01), label: "0.01s" },
    { value: positionFromIsi(0.1), label: "0.1s" },
    { value: positionFromIsi(1), label: "1s" },
    { value: positionFromIsi(10), label: "10s" },
    { value: positionFromIsi(30), label: "30s" },
  ];

  return (
    <Panel
      variant="dark"
      className={`neural-control-panel ${
        showBursts ? "" : "neural-control-panel--disabled"
      }`}
    >
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">
          Burst Detection Parameters
        </h4>
        <Tooltip title="Reset to defaults" placement="top">
          <IconButton
            variant="subtle"
            size="sm"
            onClick={handleReset}
            disabled={!showBursts}
            className="neural-control-panel__reset"
            aria-label="reset burst parameters"
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Max Inter-Spike Interval
          </span>
          <span className="neural-control-panel__field-value">
            {formatIsi(Number(interval.value) || 0)} s
          </span>
        </div>
        <Slider
          value={intervalPosition}
          onChange={handleIntervalChange}
          onChangeCommitted={handleIntervalCommitted}
          disabled={!showBursts}
          min={0}
          max={ISI_POSITION_MAX}
          step={1}
          marks={intervalMarks}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Min Spikes Per Burst
          </span>
          <span className="neural-control-panel__field-value">
            {minSpikes.value}
          </span>
        </div>
        <Slider
          value={minSpikes.value}
          onChange={(e, v) => {
            perf.count("slider.minSpikesPerBurst");
            minSpikes.onChange(e, v);
          }}
          onChangeCommitted={minSpikes.onChangeCommitted}
          disabled={!showBursts}
          min={2}
          max={10}
          step={1}
          marks={[
            { value: 2, label: "2" },
            { value: 4, label: "4" },
            { value: 6, label: "6" },
            { value: 8, label: "8" },
            { value: 10, label: "10" },
          ]}
        />
      </div>
    </Panel>
  );
};

export default BurstDetectionControls;

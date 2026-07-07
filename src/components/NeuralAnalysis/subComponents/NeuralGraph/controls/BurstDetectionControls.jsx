import React, { useContext, useEffect, useMemo } from "react";
import { Slider, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import { DataContext } from "../../../../../providers/DataProvider";
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
 * to the recording-relative ceiling below. A linear slider would make
 * the sub-second sub-range unreachable in practice; log scale puts
 * equal-pixel-distance = equal-log-distance, so 0.01 ↔ 0.1 ↔ 1 ↔ 10
 * are all the same drag.
 *
 * The MAX end scales with the recording: an inter-spike interval can't
 * meaningfully exceed the run's own span, and long (10-min+) recordings
 * need far more than the old hardcoded 30 s. We cap the slider at HALF
 * the recording duration — enough headroom for real bursts on any
 * length of run, while keeping the log slider's resolution focused
 * where bursts actually live rather than on the useless top decade that
 * would lump the whole trace into one burst.
 */
const ISI_MIN_S = 0.005;
// Ceiling used before any file is loaded (or on degenerate/empty time
// data). Once a recording is present the ceiling is half its duration.
const FALLBACK_MAX_S = 30;
// Slider internal position space — finer than 1000 isn't perceptible.
const ISI_POSITION_MAX = 1000;
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

// Normalize DataContext.extractedIndicatorTimes (plain array / typed
// array / object-of-values) to a flat time array, mirroring ROIControls.
const normalizeTimes = (times) => {
  if (!times) return null;
  if (Array.isArray(times) || ArrayBuffer.isView(times)) return times;
  if (typeof times === "object") {
    const values = Object.values(times);
    if (
      values.length > 0 &&
      (Array.isArray(values[0]) || ArrayBuffer.isView(values[0]))
    ) {
      return values[0];
    }
    return values;
  }
  return null;
};

const BurstDetectionControls = () => {
  const {
    showBursts,
    maxInterSpikeInterval,
    setMaxInterSpikeInterval,
    minSpikesPerBurst,
    setMinSpikesPerBurst,
  } = useNeuralSettings();
  const { extractedIndicatorTimes } = useContext(DataContext);
  // Sensible Ca²⁺ default — the prior 0.05 s default essentially
  // disabled burst detection on slow-sampled recordings.
  const DEFAULT_MAX_INTERVAL = 1.0;
  const DEFAULT_MIN_SPIKES = 3;

  // Recording-relative ISI ceiling = half the recording duration (see
  // the header note). Falls back to 30 s before any file is loaded.
  const isiMax = useMemo(() => {
    const timeArray = normalizeTimes(extractedIndicatorTimes);
    if (!timeArray || timeArray.length < 2) return FALLBACK_MAX_S;
    const duration = timeArray[timeArray.length - 1] - timeArray[0];
    if (!(duration > 0)) return FALLBACK_MAX_S;
    return duration / 2;
  }, [extractedIndicatorTimes]);

  // Log-scale converters, rebuilt whenever the ceiling changes. The
  // slider's value/marks/step live in position space [0, ISI_POSITION_MAX];
  // useDraftSlider stores/commits the SECONDS value.
  const { positionFromIsi, isiFromPosition } = useMemo(() => {
    const logMin = Math.log(ISI_MIN_S);
    const logRange = Math.log(isiMax) - logMin;
    return {
      positionFromIsi: (s) => {
        if (!(s > 0)) return 0;
        const clamped = Math.max(ISI_MIN_S, Math.min(isiMax, s));
        return Math.round(
          ((Math.log(clamped) - logMin) / logRange) * ISI_POSITION_MAX
        );
      },
      isiFromPosition: (p) => {
        const t = Math.max(0, Math.min(ISI_POSITION_MAX, p)) / ISI_POSITION_MAX;
        return Math.exp(logMin + t * logRange);
      },
    };
  }, [isiMax]);

  // When the ceiling shrinks (a shorter recording is loaded, or a template
  // saved on a long experiment is applied to a short one), pull the stored
  // value down so the thumb and readout stay in range.
  useEffect(() => {
    if (maxInterSpikeInterval > isiMax) {
      setMaxInterSpikeInterval(snapIsi(isiMax));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isiMax]);

  const interval = useDraftSlider(
    maxInterSpikeInterval,
    setMaxInterSpikeInterval
  );
  const minSpikes = useDraftSlider(minSpikesPerBurst, setMinSpikesPerBurst);

  const handleReset = () => {
    // Clamp the default to the ceiling for ultra-short clips (isiMax < 1 s).
    setMaxInterSpikeInterval(Math.min(DEFAULT_MAX_INTERVAL, snapIsi(isiMax)));
    setMinSpikesPerBurst(DEFAULT_MIN_SPIKES);
  };

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
  // Log-decade anchors (0.01, 0.1, 1, 10, 100, …) up to the ceiling, plus a
  // final mark at the exact ceiling so the user sees the recording-relative
  // top value. De-dupe if the ceiling lands on a decade.
  const intervalMarks = useMemo(() => {
    const marks = [];
    for (let decade = 0.01; decade < isiMax; decade *= 10) {
      marks.push({
        value: positionFromIsi(decade),
        label: `${formatIsi(decade)}s`,
      });
    }
    const topLabel = `${formatIsi(isiMax)}s`;
    if (!marks.length || marks[marks.length - 1].label !== topLabel) {
      marks.push({ value: positionFromIsi(isiMax), label: topLabel });
    }
    return marks;
  }, [isiMax, positionFromIsi]);

  return (
    <Panel
      variant="dark"
      className={`neural-control-panel neural-control-panel--stacked ${
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

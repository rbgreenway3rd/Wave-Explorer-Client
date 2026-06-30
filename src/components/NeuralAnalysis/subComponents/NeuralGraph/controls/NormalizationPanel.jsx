import React from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { Panel } from "../../../../ui";
import { useNeuralSettings, useNeuralResults } from "../../../NeuralProvider";
import "./NeuralControlPanel.css";

/**
 * NormalizationPanel — ΔF/F₀ ("detrend → F/Fo") normalization.
 *
 * When on, the neural pipeline sources the RAW signal, detrends, then
 * divides by F₀ (resting brightness = median of the raw signal), so peak
 * height / AUC become comparable well-to-well. Detection then runs in
 * ΔF/F₀ units. Distinct from the main-page Static Ratio filter, which
 * runs before detrending.
 *
 * Default OFF pending domain-expert sign-off on the math (D1 in
 * docs/neural-fofo-normalization-plan.md). Requires Trend Flattening
 * (the ΔF source). The math runs in the pipeline; this panel toggles it
 * and surfaces the per-well F₀ + unit state read-only.
 *
 * Sub-toggle: "Rescale to readable units" multiplies ΔF/F₀ by the
 * plate-wide median F₀ (the client's step 3) so peak height / AUC land in
 * a sensible magnitude instead of a tiny fold-change.
 */
const NormalizationPanel = () => {
  const {
    neuralNormalizationEnabled,
    setNeuralNormalizationEnabled,
    neuralRescaleByMedianFo,
    setNeuralRescaleByMedianFo,
    foWindowEnabled,
    setFoWindowEnabled,
    foWindowStartRatio,
    setFoWindowStartRatio,
    foWindowEndRatio,
    setFoWindowEndRatio,
    trendFlatteningEnabled,
  } = useNeuralSettings();
  const { pipelineResults, plateMedianFo, plateSkippedFoCount } =
    useNeuralResults();

  const norm = pipelineResults?.normalization || {};
  const rescaled = norm.unitMode === "dFF0_x_medianFo";
  const unitLabel = rescaled ? "ΔF/F₀ × median F₀" : "ΔF/F₀";

  // Baseline (Fo) window as whole-percent inputs (stored as 0–1 ratios).
  // The draggable chart band is the primary control; these are for
  // precision. Each edit keeps start ≤ end.
  const startPct = Math.round((foWindowStartRatio ?? 0) * 100);
  const endPct = Math.round((foWindowEndRatio ?? 1) * 100);
  const onStartPct = (e) => {
    const v = Math.min(Math.max(Number(e.target.value) || 0, 0), 100) / 100;
    setFoWindowStartRatio(Math.min(v, foWindowEndRatio));
  };
  const onEndPct = (e) => {
    const v = Math.min(Math.max(Number(e.target.value) || 0, 0), 100) / 100;
    setFoWindowEndRatio(Math.max(v, foWindowStartRatio));
  };

  return (
    <Panel variant="dark" className="neural-control-panel">
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">F/Fo Normalization</h4>
      </div>

      <FormControlLabel
        style={{ "--neural-method-accent": "var(--color-info)" }}
        control={
          <Switch
            size="small"
            checked={neuralNormalizationEnabled}
            onChange={(_, checked) => setNeuralNormalizationEnabled(checked)}
          />
        }
        label="Apply F/Fo (detrend → F/Fo)"
      />

      {neuralNormalizationEnabled && trendFlatteningEnabled && (
        <FormControlLabel
          style={{ "--neural-method-accent": "var(--color-info)" }}
          control={
            <Switch
              size="small"
              checked={neuralRescaleByMedianFo}
              onChange={(_, checked) => setNeuralRescaleByMedianFo(checked)}
            />
          }
          label="Rescale to readable units (× plate median F₀)"
        />
      )}

      {neuralNormalizationEnabled && trendFlatteningEnabled && (
        <FormControlLabel
          style={{ "--neural-method-accent": "var(--color-info)" }}
          control={
            <Switch
              size="small"
              checked={foWindowEnabled}
              onChange={(_, checked) => setFoWindowEnabled(checked)}
            />
          }
          label="Measure Fo over a window (off = whole trace)"
        />
      )}

      {neuralNormalizationEnabled && trendFlatteningEnabled && foWindowEnabled && (
        <div
          className="neural-fo-window-controls"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 6,
          }}
        >
          <span>Baseline (Fo) window:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={startPct}
            onChange={onStartPct}
            aria-label="Fo window start (% of trace)"
            style={{ width: 52 }}
          />
          <span>%–</span>
          <input
            type="number"
            min={0}
            max={100}
            value={endPct}
            onChange={onEndPct}
            aria-label="Fo window end (% of trace)"
            style={{ width: 52 }}
          />
          <span>% of trace — or drag the shaded band on the chart</span>
        </div>
      )}

      {neuralNormalizationEnabled && (
        <div className="neural-control-well-info">
          {!trendFlatteningEnabled ? (
            <p>
              Requires Trend Flattening (under Noise Suppression) — it
              supplies the detrended ΔF this divides by F₀.
            </p>
          ) : norm.skipped ? (
            <p>
              No valid F₀ for this well (empty/flat signal) — signal left in
              native units.
            </p>
          ) : norm.applied ? (
            <>
              <p>
                F₀ (this well):{" "}
                <span className="neural-control-well-info__control-key">
                  {Math.round(norm.thisWellFo)}
                </span>{" "}
                — signal shown as {unitLabel}.
              </p>
              {rescaled && (
                <p>
                  Plate median F₀:{" "}
                  <span className="neural-control-well-info__control-key">
                    {Math.round(plateMedianFo)}
                  </span>
                  {plateSkippedFoCount > 0 && (
                    <> ({plateSkippedFoCount} well(s) skipped — no valid F₀)</>
                  )}
                </p>
              )}
            </>
          ) : (
            <p>Select a well to compute F₀.</p>
          )}
          <p>
            Prominence is a % of the signal range, so the unit choice doesn't
            change which peaks are detected.
          </p>
        </div>
      )}
    </Panel>
  );
};

export default NormalizationPanel;

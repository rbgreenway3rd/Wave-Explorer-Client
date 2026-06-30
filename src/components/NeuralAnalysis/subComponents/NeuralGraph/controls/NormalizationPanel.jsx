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
    trendFlatteningEnabled,
  } = useNeuralSettings();
  const { pipelineResults, plateMedianFo, plateSkippedFoCount } =
    useNeuralResults();

  const norm = pipelineResults?.normalization || {};
  const rescaled = norm.unitMode === "dFF0_x_medianFo";
  const unitLabel = rescaled ? "ΔF/F₀ × median F₀" : "ΔF/F₀";

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

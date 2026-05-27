import React from "react";
import { FormGroup, FormControlLabel, Switch } from "@mui/material";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import CropFreeIcon from "@mui/icons-material/CropFree";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, Button } from "../../../../ui";
import {
  useNeuralInteraction,
  useNeuralSettings,
} from "../../../NeuralProvider";
import "./NeuralControlPanel.css";

/**
 * PanZoomControls — switches for chart-interaction mode (pan/zoom vs.
 * ROI-definition, mutually exclusive) plus a Reset Zoom action and a
 * pill that shows the currently active mode. Reads interaction state
 * from NeuralInteractionContext; only the imperative `resetZoom` handler
 * (a ref into NeuralGraph) is passed as a prop.
 */
const PanZoomControls = ({ resetZoom }) => {
  const {
    defineROI,
    setDefineROI,
    enablePanZoom,
    setEnablePanZoom,
    zoomState,
    setZoomState,
    panState,
    setPanState,
  } = useNeuralInteraction();
  const { resetAllSettings } = useNeuralSettings();
  const panZoomActive = !!enablePanZoom && !!zoomState && !!panState;

  const handlePanZoomToggle = (checked) => {
    setEnablePanZoom?.(checked);
    setZoomState?.(checked);
    setPanState?.(checked);
    if (checked) setDefineROI?.(false);
  };

  const handleDefineROIToggle = (checked) => {
    setDefineROI?.(checked);
    if (checked) {
      setEnablePanZoom?.(false);
      setZoomState?.(false);
      setPanState?.(false);
    }
  };

  return (
    <Panel
      variant="dark"
      className="neural-control-panel pan-zoom-controls-container"
    >
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">Chart Interaction</h4>
      </div>

      <FormGroup className="neural-control-panel__methods">
        <FormControlLabel
          style={{
            "--neural-method-accent": panZoomActive
              ? "var(--color-primary)"
              : "var(--color-text-muted)",
          }}
          control={
            <Switch
              size="small"
              checked={panZoomActive}
              onChange={(_, checked) => handlePanZoomToggle(checked)}
            />
          }
          label={
            <span className="neural-method-icon">
              <ZoomOutMapIcon />
              Enable Pan/Zoom
            </span>
          }
        />

        <FormControlLabel
          style={{
            "--neural-method-accent": defineROI
              ? "var(--color-info)"
              : "var(--color-text-muted)",
          }}
          control={
            <Switch
              size="small"
              checked={!!defineROI}
              onChange={(_, checked) => handleDefineROIToggle(checked)}
            />
          }
          label={
            <span className="neural-method-icon">
              <CropFreeIcon />
              Define ROI
            </span>
          }
        />
      </FormGroup>

      <Button
        variant="secondary"
        block
        startIcon={<RestartAltIcon />}
        onClick={resetZoom}
        className="reset-zoom-button"
      >
        Reset Zoom
      </Button>

      <Button
        variant="secondary"
        block
        startIcon={<RestartAltIcon />}
        onClick={resetAllSettings}
        className="reset-all-settings-button"
      >
        Reset All Settings
      </Button>

      {(defineROI || panZoomActive) && (
        <div
          className={
            defineROI
              ? "neural-mode-indicator neural-mode-indicator--roi"
              : "neural-mode-indicator neural-mode-indicator--panzoom"
          }
        >
          {defineROI ? <CropFreeIcon /> : <ZoomOutMapIcon />}
          {defineROI ? "ROI Definition Mode Active" : "Pan & Zoom Mode Active"}
        </div>
      )}
    </Panel>
  );
};

export default PanZoomControls;

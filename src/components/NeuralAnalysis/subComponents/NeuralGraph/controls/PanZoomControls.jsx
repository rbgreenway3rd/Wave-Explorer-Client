import React from "react";
import { FormGroup, FormControlLabel, Switch } from "@mui/material";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import CropFreeIcon from "@mui/icons-material/CropFree";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, Button } from "../../../../ui";
import "./NeuralControlPanel.css";

/**
 * PanZoomControls — switches for chart-interaction mode (pan/zoom vs.
 * ROI-definition, mutually exclusive) plus a Reset Zoom action and a
 * pill that shows the currently active mode.
 */
const PanZoomControls = ({
  defineROI,
  setDefineROI,
  enablePanZoom,
  setEnablePanZoom,
  zoomState,
  setZoomState,
  panState,
  setPanState,
  resetZoom,
}) => {
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
      <h4 className="neural-control-panel__section-title">Chart Interaction</h4>

      <FormGroup className="neural-control-panel__methods">
        <FormControlLabel
          style={{
            "--neural-method-accent": panZoomActive
              ? "var(--color-primary)"
              : "var(--color-text-muted)",
          }}
          control={
            <Switch
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

      {(defineROI || panZoomActive) && (
        <div
          className="neural-mode-indicator"
          style={
            defineROI
              ? {
                  "--neural-mode-bg": "var(--color-info-soft)",
                  "--neural-mode-border": "var(--color-info)",
                  "--neural-mode-text": "var(--color-info-dark)",
                }
              : {
                  "--neural-mode-bg": "var(--color-primary-soft)",
                  "--neural-mode-border": "var(--color-primary)",
                  "--neural-mode-text": "var(--color-primary-hover)",
                }
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

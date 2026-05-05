import { Chart } from "chart.js";
import { useContext } from "react";
import { DataContext } from "../../../providers/DataProvider";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  Tooltip,
} from "@mui/material";
import FitScreenTwoToneIcon from "@mui/icons-material/FitScreenTwoTone";
import { Button, Text, ToggleGroup } from "../../ui";
import "../../../styles/LargeGraphControls.css";

Chart.register(zoomPlugin);

export const LargeGraphControls = ({
  resetZoom,
  zoomState,
  toggleZoomState,
  changeZoomMode,
  panState,
  changePanMode,
  togglePanState,
  showLargeGraph,
  setShowLargeGraph,
  yScaleMode,
  setYScaleMode,
}) => {
  const { overlayRawAndFiltered, setOverlayRawAndFiltered } =
    useContext(DataContext);

  return (
    <div className="large-graph-controls quadrant-controls ui-surface ui-surface--panel ui-clean-forms">
      <section className="zoom-and-pan-controls">
        <div className="zoom-controls">
          <Tooltip
            title="Y Scale: Universal (whole plate) or Relative (selected wells only)"
            disableInteractive
            arrow
            placement="top"
          >
            <div className="large-graph-controls__y-scale">
              <Text size="xs" tone="muted" align="center">Y Scale</Text>
              <ToggleGroup
                size="sm"
                value={yScaleMode}
                onChange={(_, v) => {
                  if (v) setYScaleMode(v);
                }}
                options={[
                  { value: "all", label: "Universal" },
                  { value: "selected", label: "Relative" },
                ]}
                aria-label="raw waves y-scale source"
              />
            </div>
          </Tooltip>

          <FormControlLabel
            control={
              <Checkbox
                id="zoom-state"
                checked={zoomState}
                onChange={() => toggleZoomState(zoomState)}
                color="primary"
              />
            }
            label="Zoom"
          />

          <section className="zoom-controls-radios">
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="zoom mode"
                name="zoom-mode"
                defaultValue="xy"
                onChange={(e) => changeZoomMode(e.target.value)}
              >
                <FormControlLabel
                  value="x"
                  control={<Radio disabled={!zoomState} />}
                  label="X"
                />
                <FormControlLabel
                  value="y"
                  control={<Radio disabled={!zoomState} />}
                  label="Y"
                />
                <FormControlLabel
                  value="xy"
                  control={<Radio disabled={!zoomState} />}
                  label="X-Y"
                />
              </RadioGroup>
            </FormControl>
          </section>
        </div>

        <div className="pan-controls">
          <FormControlLabel
            control={
              <Checkbox
                id="pan-state"
                checked={panState}
                onChange={() => togglePanState(panState)}
                color="primary"
              />
            }
            label="Pan"
          />

          <section className="pan-controls-radios">
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="pan mode"
                name="pan-mode"
                defaultValue="xy"
                onChange={(e) => changePanMode(e.target.value)}
              >
                <FormControlLabel
                  value="x"
                  control={<Radio disabled={!panState} />}
                  label="X"
                />
                <FormControlLabel
                  value="y"
                  control={<Radio disabled={!panState} />}
                  label="Y"
                />
                <FormControlLabel
                  value="xy"
                  control={<Radio disabled={!panState} />}
                  label="X-Y"
                />
              </RadioGroup>
            </FormControl>
            <FormControlLabel
              className="large-graph-controls__overlay-label"
              control={
                <Checkbox
                  id="overlay-raw-filtered"
                  checked={overlayRawAndFiltered}
                  onChange={(e) => setOverlayRawAndFiltered(e.target.checked)}
                  color="primary"
                />
              }
              label="Overlay Filtered Data"
            />
          </section>
        </div>
      </section>

      <Button
        className="large-graph-controls__reset-button"
        variant="primary"
        block
        startIcon={<FitScreenTwoToneIcon />}
        onClick={resetZoom}
      >
        Reset Zoom
      </Button>
    </div>
  );
};

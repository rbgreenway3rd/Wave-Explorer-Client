import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  Button,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  FormControl,
} from "@mui/material";
import FitScreenTwoToneIcon from "@mui/icons-material/FitScreenTwoTone";
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
}) => {
  return (
    <div className="large-graph-controls">
      <section className="zoom-and-pan-controls">
        <div className="zoom-controls">
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
                defaultValue="zoomXY"
                onChange={(e) => changeZoomMode(e.target.value)}
              >
                <FormControlLabel
                  value="zoomX"
                  control={<Radio disabled={!zoomState} />}
                  label="X"
                />
                <FormControlLabel
                  value="zoomY"
                  control={<Radio disabled={!zoomState} />}
                  label="Y"
                />
                <FormControlLabel
                  value="zoomXY"
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
                defaultValue="panXY"
                onChange={(e) => changePanMode(e.target.value)}
              >
                <FormControlLabel
                  value="panX"
                  control={<Radio disabled={!panState} />}
                  label="X"
                />
                <FormControlLabel
                  value="panY"
                  control={<Radio disabled={!panState} />}
                  label="Y"
                />
                <FormControlLabel
                  value="panXY"
                  control={<Radio disabled={!panState} />}
                  label="X-Y"
                />
              </RadioGroup>
            </FormControl>
          </section>
        </div>
      </section>
      <Button
        className="reset-zoom-button"
        variant="outlined"
        onClick={resetZoom}
      >
        <FitScreenTwoToneIcon />
        Reset Zoom
      </Button>
    </div>
  );
};

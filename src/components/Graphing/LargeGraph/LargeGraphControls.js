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
            // style={{
            //   backgroundImage:
            //     "linear-gradient( rgb(96, 127, 190, 0.25) 0%,rgb(48, 79.5, 143, 0.15) 50%, rgb(0,32,96, 0.05) 70%)",
            // }}
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
            // style={{
            //   backgroundImage:
            //     "linear-gradient( rgb(96, 127, 190, 0.25) 0%,rgb(48, 79.5, 143, 0.15) 50%, rgb(0,32,96, 0.05) 70%)",
            // }}
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
          </section>
        </div>
      </section>
      <Button
        className="reset-zoom-button"
        variant="outlined"
        onClick={resetZoom}
      >
        <FitScreenTwoToneIcon />
        <Typography align="center" variant="h1">
          Reset Zoom
        </Typography>
      </Button>
    </div>
  );
};

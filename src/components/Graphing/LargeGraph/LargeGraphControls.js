import { Chart } from "chart.js";
import { useContext } from "react";
import { DataContext } from "../../../providers/DataProvider";
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
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
}) => {
  const { overlayRawAndFiltered, setOverlayRawAndFiltered } =
    useContext(DataContext);
  return (
    <div className="large-graph-controls">
      <section
        className="zoom-and-pan-controls"
        style={{
          backgroundColor: "rgb(120, 120, 120)",
        }}
      >
        <div className="zoom-controls">
          <FormControlLabel
            style={{
              // backgroundColor: "rgb(120, 120, 120)",
              backgroundColor: "rgba(0, 0, 0, 0)",
              borderBottom: "none",
            }}
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
            style={{
              // backgroundColor: "rgb(120, 120, 120)",
              backgroundColor: "rgba(0, 0, 0, 0)",
              borderBottom: "none",
            }}
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

          <section
            className="pan-controls-radios"
            style={{ marginBottom: "0.25em" }}
          >
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
              sx={{ marginTop: "0.5em", fontSize: "0.5em" }}
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
      {/* Reset Zoom Button */}
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
      {/* Toggle LargeGraph visibility button */}
      {/* <Button
        className="toggle-large-graph-button"
        variant="contained"
        color={showLargeGraph ? "secondary" : "primary"}
        onClick={() => setShowLargeGraph((prev) => !prev)}
        sx={{ marginTop: "1em" }}
      >
        {showLargeGraph ? <VisibilityOffIcon /> : <VisibilityIcon />}
        <Typography variant="button" sx={{ marginLeft: "0.5em" }}>
          {showLargeGraph ? "Hide Large Graph" : "Show Large Graph"}
        </Typography>
      </Button> */}
    </div>
  );
};

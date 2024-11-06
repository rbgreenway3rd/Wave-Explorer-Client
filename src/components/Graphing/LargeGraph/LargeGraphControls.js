// import { Chart } from "chart.js";
// import zoomPlugin from "chartjs-plugin-zoom";
// import "../../../styles/LargeGraphControls.css";

// Chart.register(zoomPlugin);

// export const LargeGraphControls = ({
//   resetZoom,
//   zoomState,
//   toggleZoomState,
//   changeZoomMode,
//   panState,
//   changePanMode,
//   togglePanState,
// }) => {
//   return (
//     <div className="large-graph-controls">
//       <section className="zoom-and-pan-controls">
//         <div className="zoom-controls">
//           <header className="zoom-controls-header">
//             Zoom
//             <input
//               type="checkbox"
//               id="zoom-state"
//               className="zoom-state-checkbox"
//               defaultChecked={true}
//               onChange={() => toggleZoomState(zoomState)}
//             />
//           </header>
//           <section className="zoom-controls-radios">
//             <label>
//               <input
//                 type="radio"
//                 id="zoom-x"
//                 className="zoom-controls__radio"
//                 value="zoomX"
//                 name="radio-group-zoom"
//                 onChange={() => changeZoomMode("x")}
//               />
//               X
//             </label>
//             <label>
//               <input
//                 type="radio"
//                 id="zoom-y"
//                 className="zoom-controls__radio"
//                 value="zoomY"
//                 name="radio-group-zoom"
//                 onChange={() => changeZoomMode("y")}
//               />
//               Y
//             </label>
//             <label>
//               <input
//                 type="radio"
//                 id="zoom-xy"
//                 className="zoom-controls__radio"
//                 value="zoomXY"
//                 name="radio-group-zoom"
//                 defaultChecked={true}
//                 onChange={() => changeZoomMode("xy")}
//               />
//               X-Y
//             </label>
//           </section>
//         </div>
//         <div className="pan-controls">
//           <header className="pan-controls-header">
//             Pan
//             <input
//               type="checkbox"
//               id="pan-state"
//               className="pan-state-checkbox"
//               defaultChecked={true}
//               onChange={() => togglePanState(panState)}
//             />
//           </header>
//           <section className="pan-controls-radios">
//             <label>
//               <input
//                 type="radio"
//                 id="pan-x"
//                 className="pan-controls__radio"
//                 value="panX"
//                 name="radio-group-pan"
//                 onChange={() => changePanMode("x")}
//               />
//               X
//             </label>
//             <label>
//               <input
//                 type="radio"
//                 id="pan-y"
//                 className="pan-controls__radio"
//                 value="panY"
//                 name="radio-group-pan"
//                 onChange={() => changePanMode("y")}
//               />
//               Y
//             </label>
//             <label>
//               <input
//                 type="radio"
//                 id="pan-xy"
//                 className="pan-controls__radio"
//                 value="panXY"
//                 name="radio-group-pan"
//                 defaultChecked={true}
//                 onChange={() => changePanMode("xy")}
//               />
//               X-Y
//             </label>
//           </section>
//         </div>
//       </section>
//       <button className="reset-zoom-button" onClick={resetZoom}>
//         Reset <br />
//         Zoom
//       </button>
//     </div>
//   );
// };

// MATERIAL UI
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
          <header className="zoom-controls-header">
            <Typography variant="h6">Zoom</Typography>
            <FormControlLabel
              control={
                <Checkbox
                  id="zoom-state"
                  checked={zoomState}
                  onChange={() => toggleZoomState(zoomState)}
                  color="primary"
                />
              }
              label="Enable Zoom"
            />
          </header>
          <section className="zoom-controls-radios">
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="zoom mode"
                name="zoom-mode"
                defaultValue="zoomXY"
                onChange={(e) => changeZoomMode(e.target.value)}
              >
                <FormControlLabel value="zoomX" control={<Radio />} label="X" />
                <FormControlLabel value="zoomY" control={<Radio />} label="Y" />
                <FormControlLabel
                  value="zoomXY"
                  control={<Radio />}
                  label="X-Y"
                />
              </RadioGroup>
            </FormControl>
          </section>
        </div>
        <div className="pan-controls">
          <header className="pan-controls-header">
            <Typography variant="h6">Pan</Typography>
            <FormControlLabel
              control={
                <Checkbox
                  id="pan-state"
                  checked={panState}
                  onChange={() => togglePanState(panState)}
                  color="primary"
                />
              }
              label="Enable Pan"
            />
          </header>
          <section className="pan-controls-radios">
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="pan mode"
                name="pan-mode"
                defaultValue="panXY"
                onChange={(e) => changePanMode(e.target.value)}
              >
                <FormControlLabel value="panX" control={<Radio />} label="X" />
                <FormControlLabel value="panY" control={<Radio />} label="Y" />
                <FormControlLabel
                  value="panXY"
                  control={<Radio />}
                  label="X-Y"
                />
              </RadioGroup>
            </FormControl>
          </section>
        </div>
      </section>
      <Button
        className="reset-zoom-button"
        variant="contained"
        color="secondary"
        onClick={resetZoom}
      >
        Reset Zoom
      </Button>
    </div>
  );
};

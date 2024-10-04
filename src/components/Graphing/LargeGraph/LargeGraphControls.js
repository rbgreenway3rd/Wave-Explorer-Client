import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
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
      <section className="zoom-controls">
        <header className="zoom-controls-header">
          Zoom
          <input
            type="checkbox"
            id="zoom-state"
            className="zoom-state-checkbox"
            defaultChecked={true}
            onChange={() => toggleZoomState(zoomState)}
          />
        </header>
        <section className="zoom-controls-radios">
          <label>
            <input
              type="radio"
              id="zoom-x"
              className="zoom-controls__radio"
              value="zoomX"
              name="radio-group-zoom"
              onChange={() => changeZoomMode("x")}
            />
            X
          </label>
          <label>
            <input
              type="radio"
              id="zoom-y"
              className="zoom-controls__radio"
              value="zoomY"
              name="radio-group-zoom"
              onChange={() => changeZoomMode("y")}
            />
            Y
          </label>
          <label>
            <input
              type="radio"
              id="zoom-xy"
              className="zoom-controls__radio"
              value="zoomXY"
              name="radio-group-zoom"
              defaultChecked={true}
              onChange={() => changeZoomMode("xy")}
            />
            X-Y
          </label>
        </section>
      </section>
      <section className="pan-controls">
        <header className="pan-controls-header">
          Pan
          <input
            type="checkbox"
            id="pan-state"
            className="pan-state-checkbox"
            defaultChecked={true}
            onChange={() => togglePanState(panState)}
          />
        </header>
        <section className="pan-controls-radios">
          <label>
            <input
              type="radio"
              id="pan-x"
              className="pan-controls__radio"
              value="panX"
              name="radio-group-pan"
              onChange={() => changePanMode("x")}
            />
            X
          </label>
          <label>
            <input
              type="radio"
              id="pan-y"
              className="pan-controls__radio"
              value="panY"
              name="radio-group-pan"
              onChange={() => changePanMode("y")}
            />
            Y
          </label>
          <label>
            <input
              type="radio"
              id="pan-xy"
              className="pan-controls__radio"
              value="panXY"
              name="radio-group-pan"
              defaultChecked={true}
              onChange={() => changePanMode("xy")}
            />
            X-Y
          </label>
        </section>
      </section>
      <button className="reset-zoom-button" onClick={resetZoom}>
        Reset Zoom
      </button>
    </div>
  );
};

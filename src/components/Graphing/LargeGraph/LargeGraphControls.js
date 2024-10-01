import { useState, useEffect } from "react";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

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
        <header className="zoom-controls-header">Zoom</header>
        <input
          type="checkbox"
          id="zoom-state"
          className="zoom-state-checkbox"
          defaultChecked={true}
          onChange={() => toggleZoomState(zoomState)}
        />
        <label>X</label>
        <input
          type="radio"
          id="zoom-x"
          className="zoom-controls__radio"
          value="zoomX"
          name="radio-group-zoom"
          onChange={() => changeZoomMode("x")}
        />
        <label>Y</label>
        <input
          type="radio"
          id="zoom-y"
          className="zoom-controls__radio"
          value="zoomY"
          name="radio-group-zoom"
          onChange={() => changeZoomMode("y")}
        />
        <label>X-Y</label>
        <input
          type="radio"
          id="zoom-xy"
          className="zoom-controls__radio"
          value="zoomXY"
          name="radio-group-zoom"
          defaultChecked={true}
          onChange={() => changeZoomMode("xy")}
        />
      </section>
      <section className="pan-controls">
        <header className="pan-controls-header">Pan</header>
        <input
          type="checkbox"
          id="pan-state"
          className="pan-state-checkbox"
          defaultChecked={true}
          onChange={() => togglePanState(panState)}
        />
        <label>X</label>
        <input
          type="radio"
          id="pan-x"
          className="pan-controls__radio"
          value="panX"
          name="radio-group-pan"
          onChange={() => changePanMode("x")}
        />
        <label>Y</label>
        <input
          type="radio"
          id="pan-y"
          className="pan-controls__radio"
          value="panY"
          name="radio-group-pan"
          onChange={() => changePanMode("y")}
        />
        <label>X-Y</label>
        <input
          type="radio"
          id="pan-xy"
          className="pan-controls__radio"
          value="panXY"
          name="radio-group-pan"
          defaultChecked={true}
          onChange={() => changePanMode("xy")}
        />
      </section>
      <button className="reset-zoom-button" onClick={resetZoom}>
        Reset Zoom
      </button>
    </div>
  );
};

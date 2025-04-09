import React, {
  useEffect,
  useState,
  useContext,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Line } from "react-chartjs-2";
import { Chart, registerables, Tooltip } from "chart.js";
import { AnalysisContext } from "../../AnalysisProvider";
import { DataContext } from "../../../../providers/DataProvider";
import usePrepareChartData from "../../utilities/PrepareChartData";
import { getChartOptions } from "./ChartOptions";
import zoomPlugin from "chartjs-plugin-zoom";

import "../../styles/CardiacGraph.css";
import ProcessApdData from "../../../FileHandling/Matlab/MatlabClone";

Chart.register(...registerables, Tooltip, zoomPlugin);

export const CardiacGraph = forwardRef(
  ({ useAdjustedBases, findPeaksWindowWidth, peakProminence }, ref) => {
    const {
      selectedWell,
      peakResults,
      peakMagnitudes,
      showVerticalLines,
      showDataPoints,
      showAscentPoints,
      showDescentPoints,
      baseline,
      showSelectedData,
      showBaselineData,
    } = useContext(AnalysisContext);
    const { extractedIndicatorTimes } = useContext(DataContext);
    const [chartData, setChartData] = useState(null);
    const [smoothedData, setSmoothedData] = useState([]);
    // Zoom and Pan state for Cardiac Graph
    const [zoomState, setZoomState] = useState(true);
    const [zoomMode, setZoomMode] = useState("xy");
    const [panState, setPanState] = useState(true);
    const [panMode, setPanMode] = useState("xy");
    // Ref to access Cardiac Graph's chart instance
    const cardiacGraphRef = useRef(null);

    const selectedData = selectedWell?.indicators?.[0]?.filteredData;

    const preparedChartData = usePrepareChartData(
      selectedData,
      peakResults,
      smoothedData,
      peakProminence,
      findPeaksWindowWidth,
      extractedIndicatorTimes,
      useAdjustedBases,
      peakMagnitudes
    );

    const adpData = selectedData ? ProcessApdData(selectedData) : null;
    // const adpData = baseline ? ProcessApdData(baseline) : null;

    // console.log(adpData);
    // Functions to handle zoom state changes
    const toggleZoomState = (currentZoomState) => {
      setZoomState(!currentZoomState);
    };
    const changeZoomMode = (mode) => {
      setZoomMode(mode);
    };
    // Functions to handle pan state changes
    const togglePanState = (currentPanState) => {
      setPanState(!currentPanState);
    };
    const changePanMode = (mode) => {
      setPanMode(mode);
    };

    const chartOptions = getChartOptions(
      extractedIndicatorTimes,
      chartData,
      zoomState,
      zoomMode,
      panState,
      panMode
    );
    useEffect(() => {
      if (!selectedWell) {
        console.error("No well selected");
        return;
      }

      if (!selectedData || selectedData.length === 0) {
        console.error("Selected data is empty or undefined");
        return;
      }

      setChartData(preparedChartData);
    }, [
      selectedWell,
      peakResults,
      smoothedData,
      peakProminence,
      findPeaksWindowWidth,
      extractedIndicatorTimes,
      useAdjustedBases,
      showVerticalLines,
      showDataPoints,
      showAscentPoints,
      showDescentPoints,
      showSelectedData,
      showBaselineData,
      // chartOptions,
      selectedData,
    ]);

    // Expose resetZoom function to parent via ref
    useImperativeHandle(ref, () => ({
      resetZoom() {
        if (cardiacGraphRef.current) {
          cardiacGraphRef.current.resetZoom();
        }
      },
    }));

    return (
      <>
        {selectedWell && chartData ? (
          <Line
            className="cardiac-graph"
            data={chartData}
            options={chartOptions}
            ref={cardiacGraphRef}
            style={{
              background: "rgb(0, 0, 0)",
              width: "100%",
            }}
          />
        ) : (
          <p className="no-well-selected">
            No well selected or no chart data available
          </p>
        )}
      </>
    );
  }
);

export default CardiacGraph;

import React, {
  useContext,
  useEffect,
  useState,
  useImperativeHandle,
  useRef,
  forwardRef,
  useCallback,
} from "react";
import { suppressNoise } from "../../utilities/noiseSuppression";
import {
  baselineCorrected,
  baselineSmoothed,
} from "../../utilities/neuralSmoothing";
import { Line } from "react-chartjs-2";
import { NeuralContext } from "../../NeuralProvider";
import { DataContext } from "../../../../providers/DataProvider";
import { Chart, registerables, Tooltip } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
// ROI and Pan/Zoom toggles moved to NeuralControls

Chart.register(...registerables, Tooltip, zoomPlugin, annotationPlugin);

const NeuralGraph = forwardRef(
  (
    {
      useAdjustedBases,
      findPeaksWindowWidth,
      peakProminence,
      className,
      processedSignal,
      noiseSuppressionActive = false,
      smoothingWindow = 5,
      subtractControl = false,
      filterBaseline = false,
      baselineCorrection = false,
      controlWell = null,
      decimationEnabled = true,
      decimationSamples = 200,
      defineROI = false,
      enablePanZoom = true,
      zoomState = true,
      panState = true,
      roiList,
      setRoiList,
      currentRoiIndex,
      setCurrentRoiIndex,
      showBursts = false,
    },
    ref
  ) => {
    const { selectedWell, peakResults, burstResults } =
      useContext(NeuralContext);
    const { extractedIndicatorTimes, wellArrays, globalMaxY } =
      useContext(DataContext);
    const [chartData, setChartData] = useState(null);
    // ROI selection state
    const [roiStart, setRoiStart] = useState(null);
    const [roiEnd, setRoiEnd] = useState(null);
    const [isSelectingROI, setIsSelectingROI] = useState(false);
    const [roiAnnotation, setRoiAnnotation] = useState(null);
    const [annotationKey, setAnnotationKey] = useState(0); // for forcing re-render
    // Pan/Zoom and ROI mode toggles are now props
    // zoomState, panState, defineROI, enablePanZoom, setZoomState, setPanState are now props
    // decimationEnabled is now a prop
    const neuralGraphRef = useRef(null);

    // Helper: is array of {x, y} objects?
    const isXYArray = (arr) =>
      Array.isArray(arr) &&
      arr.length > 0 &&
      typeof arr[0] === "object" &&
      arr[0] !== null &&
      "x" in arr[0] &&
      "y" in arr[0];
    // Helper: is array of numbers?
    const isNumArray = (arr) =>
      Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "number";

    useEffect(() => {
      // Always create a new chartData object when processedSignal changes
      if (
        !processedSignal ||
        !Array.isArray(processedSignal) ||
        processedSignal.length === 0
      ) {
        setChartData(null);
        return;
      }
      // Detection is handled in NeuralControls; here we just visualize peakResults from context
      // Always map processedSignal to {x, y} objects for Chart.js (now guaranteed to be {x, y})
      const chartPoints = processedSignal.map((pt) => ({ x: pt.x, y: pt.y }));
      // Add scatter overlay for detected peaks (NeuralPeak)
      let peakScatter = [];
      if (Array.isArray(peakResults) && peakResults.length > 0) {
        peakScatter = peakResults.map((pk) => ({
          x: pk.peakCoords.x,
          y: pk.peakCoords.y,
        }));
      }
      // Add scatter overlay for bases of detected peaks
      let baseScatter = [];
      if (Array.isArray(peakResults) && peakResults.length > 0) {
        // Draw both left and right bases for each peak
        baseScatter = peakResults.flatMap((pk) => [
          { x: pk.leftBaseCoords.x, y: pk.leftBaseCoords.y },
          { x: pk.rightBaseCoords.x, y: pk.rightBaseCoords.y },
        ]);
      }

      setChartData({
        datasets: [
          ...(baseScatter.length > 0
            ? [
                {
                  type: "scatter",
                  label: "Spike Bases",
                  data: baseScatter,
                  pointBackgroundColor: "#ffffffff",
                  pointBorderColor: "#fff",
                  pointRadius: 4,
                  showLine: false,
                  borderWidth: 0,
                },
              ]
            : []),
          {
            label: noiseSuppressionActive
              ? "Noise Suppressed Data"
              : "Neural Data",
            data: chartPoints,
            borderColor: noiseSuppressionActive
              ? "#00bcd4"
              : "rgb(0, 200, 255)",
            borderWidth: 1.5,
            fill: false,
          },
          ...(peakScatter.length > 0
            ? [
                {
                  type: "scatter",
                  label: "Detected Spikes",
                  data: peakScatter,
                  pointBackgroundColor: "#ff1744",
                  pointBorderColor: "#fff",
                  pointRadius: 5,
                  showLine: false,
                  borderWidth: 0,
                },
              ]
            : []),
        ],
      });
    }, [
      processedSignal,
      noiseSuppressionActive,
      findPeaksWindowWidth,
      peakProminence,
      peakResults,
    ]);

    const chartOptions = {
      normalized: true,
      maintainAspectRatio: false,
      responsive: true,
      devicePixelRatio: window.devicePixelRatio || 1,
      spanGaps: false,
      events: defineROI
        ? ["mousedown", "mousemove", "mouseup", "mouseout"]
        : [
            "mousemove",
            "mouseout",
            "click",
            "touchstart",
            "touchmove",
            ...(enablePanZoom && !defineROI ? ["wheel", "mousedown"] : []),
          ],
      animation: { duration: 0 },
      parsing: false,
      plugins: {
        legend: false,
        decimation: {
          enabled: decimationEnabled,
          algorithm: "lttb",
          samples: decimationSamples,
          threshold: 50,
        },
        tooltip: {
          enabled: false,
          roiList,
          setRoiList,
          currentRoiIndex,
          setCurrentRoiIndex,
          pan: {
            enabled: enablePanZoom && !defineROI && panState,
            mode: panState ? "x" : undefined,
          },
          zoom: {
            wheel: { enabled: enablePanZoom && !defineROI && zoomState },
            pinch: { enabled: enablePanZoom && !defineROI && zoomState },
            mode: "x",
          },
        },
      },
      elements: {
        point: { radius: 0 },
        line: { borderWidth: 1.5 },
      },
      layout: {
        autoPadding: false,
        padding: { left: -30, bottom: -30 },
      },
      scales: {
        x: {
          type: "time",
          ticks: { display: false },
          grid: { display: false },
        },
        y: {
          ticks: { display: false },
          grid: { display: false },
          max: globalMaxY !== undefined ? globalMaxY : undefined,
        },
      },
    };
    console.log(globalMaxY);
    // Mouse event handlers for ROI selection (only active if defineROI is true)
    const handleMouseDown = (event) => {
      if (!defineROI) return;
      const chart = neuralGraphRef.current;
      if (!chart) return;
      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setIsSelectingROI(true);
      setRoiStart(x);
      setRoiEnd(null);
    };

    const handleMouseMove = useCallback(
      (event) => {
        if (!defineROI || !isSelectingROI) return;
        const chart = neuralGraphRef.current;
        if (!chart) return;
        const rect = chart.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        setRoiEnd(x);

        // Draw annotation box dynamically
        const xMin = Math.min(roiStart, x);
        const xMax = Math.max(roiStart, x);
        const yMin = chart.scales.y.min;
        const yMax = chart.scales.y.max;
        const xMinVal = chart.scales.x.getValueForPixel(xMin);
        const xMaxVal = chart.scales.x.getValueForPixel(xMax);
        setRoiAnnotation({
          type: "box",
          xMin: xMinVal,
          xMax: xMaxVal,
          yMin,
          yMax,
          backgroundColor: "rgba(0, 255, 0, 0.2)",
          borderColor: "rgba(0, 255, 0, 1)",
          borderWidth: 2,
        });
        setAnnotationKey((k) => k + 1); // force re-render
      },
      [defineROI, isSelectingROI, roiStart]
    );

    const handleMouseUp = (event) => {
      if (!defineROI || !isSelectingROI) return;
      setIsSelectingROI(false);
      const chart = neuralGraphRef.current;
      if (!chart) return;
      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      let xMin = Math.min(roiStart, x);
      let xMax = Math.max(roiStart, x);
      // Convert to data values
      let xMinVal = chart.scales.x.getValueForPixel(xMin);
      let xMaxVal = chart.scales.x.getValueForPixel(xMax);
      setRoiAnnotation({
        type: "box",
        xMin: xMinVal,
        xMax: xMaxVal,
        yMin: chart.scales.y.min,
        yMax: chart.scales.y.max,
        backgroundColor: "rgba(0, 255, 0, 0.2)",
        borderColor: "rgba(0, 255, 0, 1)",
        borderWidth: 2,
      });
      setAnnotationKey((k) => k + 1);

      // If in ROI definition mode for a specific index, add ROI to list and clear currentRoiIndex
      if (
        defineROI &&
        currentRoiIndex !== null &&
        typeof setRoiList === "function" &&
        typeof setCurrentRoiIndex === "function"
      ) {
        const newRoi = {
          xMin: xMinVal,
          xMax: xMaxVal,
          yMin: chart.scales.y.min,
          yMax: chart.scales.y.max,
        };
        const updatedRois = [...roiList];
        updatedRois[currentRoiIndex] = newRoi;
        setRoiList(updatedRois);
        setCurrentRoiIndex(null);
      }
    };

    useImperativeHandle(ref, () => ({
      resetZoom() {
        if (neuralGraphRef.current) {
          neuralGraphRef.current.resetZoom();
        }
      },
    }));

    // Add annotation plugin config if ROI is present
    // (chartDataWithAnnotation is unused, so removed)

    // Combine all ROI boxes: completed (roiList) and the one being drawn (roiAnnotation)
    // Color palette for unique ROI colors
    const roiColors = [
      { bg: "rgba(0, 255, 0, 0.15)", border: "rgba(0, 255, 0, 0.7)" }, // green
      { bg: "rgba(0, 0, 255, 0.12)", border: "rgba(0, 0, 255, 0.7)" }, // blue
      { bg: "rgba(255, 0, 0, 0.12)", border: "rgba(255, 0, 0, 0.7)" }, // red
      { bg: "rgba(255, 165, 0, 0.13)", border: "rgba(255, 165, 0, 0.7)" }, // orange
      { bg: "rgba(128, 0, 128, 0.13)", border: "rgba(128, 0, 128, 0.7)" }, // purple
      { bg: "rgba(0, 206, 209, 0.13)", border: "rgba(0, 206, 209, 0.7)" }, // teal
      { bg: "rgba(255, 192, 203, 0.13)", border: "rgba(255, 192, 203, 0.7)" }, // pink
      { bg: "rgba(255, 255, 0, 0.13)", border: "rgba(255, 255, 0, 0.7)" }, // yellow
    ];

    const allRoiAnnotations = {};
    if (Array.isArray(roiList)) {
      roiList.forEach((roi, idx) => {
        if (roi && roi.xMin !== undefined && roi.xMax !== undefined) {
          const color = roiColors[idx % roiColors.length];
          allRoiAnnotations[`roi${idx + 1}`] = {
            type: "box",
            xMin: roi.xMin,
            xMax: roi.xMax,
            yMin: roi.yMin,
            yMax: roi.yMax,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 2,
          };
        }
      });
    }
    // Add burst annotations if enabled
    if (showBursts && Array.isArray(burstResults)) {
      burstResults.forEach((burst, idx) => {
        allRoiAnnotations[`burst${idx + 1}`] = {
          type: "box",
          xMin: burst.startTime,
          xMax: burst.endTime,
          backgroundColor: "rgba(255, 247, 0, 0.2)",
          borderColor: "rgba(246, 255, 0, 0.5)",
          borderWidth: 1,
        };
      });
    }
    // Add the currently drawn ROI (if any)
    if (roiAnnotation) {
      allRoiAnnotations[`roiCurrent`] = roiAnnotation;
    }

    return (
      <>
        {selectedWell && chartData ? (
          <Line
            className={className}
            data={chartData}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                annotation: { annotations: allRoiAnnotations },
              },
            }}
            ref={neuralGraphRef}
            style={{
              background: "rgb(0, 0, 0)",
              width: "100%",
              border: "0.1em solid rgb(100, 100, 100)",
            }}
            onMouseDown={defineROI ? handleMouseDown : undefined}
            onMouseMove={defineROI ? handleMouseMove : undefined}
            onMouseUp={defineROI ? handleMouseUp : undefined}
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
export default NeuralGraph;

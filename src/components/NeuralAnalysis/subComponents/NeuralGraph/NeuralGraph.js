import React, {
  useContext,
  useEffect,
  useState,
  useImperativeHandle,
  useRef,
  forwardRef,
  useCallback,
  useMemo,
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

    const localMaxY = processedSignal
      ? Math.max(...processedSignal.map((pt) => pt.y))
      : globalMaxY;

    // Color palette for unique ROI colors (memoized to prevent dependency changes)
    const roiColors = useMemo(
      () => [
        { bg: "rgba(0, 255, 0, 0.15)", border: "rgba(0, 255, 0, 0.7)" }, // green
        { bg: "rgba(0, 0, 255, 0.12)", border: "rgba(0, 0, 255, 0.7)" }, // blue
        { bg: "rgba(255, 0, 0, 0.12)", border: "rgba(255, 0, 0, 0.7)" }, // red
        { bg: "rgba(255, 165, 0, 0.13)", border: "rgba(255, 165, 0, 0.7)" }, // orange
        { bg: "rgba(128, 0, 128, 0.13)", border: "rgba(128, 0, 128, 0.7)" }, // purple
        { bg: "rgba(0, 206, 209, 0.13)", border: "rgba(0, 206, 209, 0.7)" }, // teal
        { bg: "rgba(255, 192, 203, 0.13)", border: "rgba(255, 192, 203, 0.7)" }, // pink
        { bg: "rgba(255, 255, 0, 0.13)", border: "rgba(255, 255, 0, 0.7)" }, // yellow
      ],
      []
    );

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

    // Initialize chart data once when well is selected
    useEffect(() => {
      if (
        !processedSignal ||
        !Array.isArray(processedSignal) ||
        processedSignal.length === 0
      ) {
        setChartData(null);
        return;
      }

      // Only set initial chart data if it doesn't exist
      if (!chartData) {
        const chartPoints = processedSignal.map((pt) => ({ x: pt.x, y: pt.y }));
        setChartData({
          datasets: [
            {
              label: "Neural Data",
              data: chartPoints,
              borderColor: "rgb(0, 200, 255)",
              borderWidth: 1.5,
              fill: false,
            },
          ],
        });
      }
    }, [processedSignal, chartData]);

    // Update chart data imperatively to preserve zoom state
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart || !processedSignal || processedSignal.length === 0) return;

      // Prepare updated datasets
      const chartPoints = processedSignal.map((pt) => ({ x: pt.x, y: pt.y }));

      let peakScatter = [];
      if (Array.isArray(peakResults) && peakResults.length > 0) {
        peakScatter = peakResults.map((pk) => ({
          x: pk.peakCoords.x,
          y: pk.peakCoords.y,
        }));
      }

      let baseScatter = [];
      if (Array.isArray(peakResults) && peakResults.length > 0) {
        baseScatter = peakResults.flatMap((pk) => [
          { x: pk.leftBaseCoords.x, y: pk.leftBaseCoords.y },
          { x: pk.rightBaseCoords.x, y: pk.rightBaseCoords.y },
        ]);
      }

      const newDatasets = [
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
          borderColor: noiseSuppressionActive ? "#00bcd4" : "rgb(0, 200, 255)",
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
      ];

      // Mutate chart data imperatively without triggering re-render
      chart.data.datasets = newDatasets;
      chart.update("none"); // Update without animation to preserve zoom
    }, [processedSignal, noiseSuppressionActive, peakResults]);

    // Memoize chartOptions with NO dependencies to prevent recreation
    // Initialize with pan/zoom enabled based on initial props
    const initialPanZoomEnabled = enablePanZoom && !defineROI;
    const chartOptions = useMemo(
      () => ({
        normalized: true,
        maintainAspectRatio: false,
        responsive: true,
        devicePixelRatio: window.devicePixelRatio || 1,
        spanGaps: false,
        events: initialPanZoomEnabled
          ? [
              "mousedown",
              "mousemove",
              "mouseup",
              "mouseout",
              "click",
              "touchstart",
              "touchmove",
              "wheel",
            ]
          : ["mousemove", "mouseout", "click", "touchstart", "touchmove"],
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
          },
          annotation: {
            annotations: {},
          },
          zoom: {
            limits: {
              x: { minRange: 0 },
            },
            pan: {
              enabled: initialPanZoomEnabled && panState,
              mode: initialPanZoomEnabled && panState ? "x" : false,
            },
            zoom: {
              wheel: { enabled: initialPanZoomEnabled && zoomState },
              pinch: { enabled: initialPanZoomEnabled && zoomState },
              mode: initialPanZoomEnabled && zoomState ? "x" : false,
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
          },
        },
        transitions: {
          zoom: {
            animation: {
              duration: 0,
            },
          },
        },
      }),
      []
    ); // Empty array = create once, never recreate

    // Mutate chart options in place when controls change (preserves zoom)
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart) return;

      // Mutate decimation settings
      chart.options.plugins.decimation.enabled = decimationEnabled;
      chart.options.plugins.decimation.samples = decimationSamples;

      // Mutate zoom/pan settings
      const isPanZoomEnabled = enablePanZoom && !defineROI;
      chart.options.plugins.zoom.pan.enabled = isPanZoomEnabled && panState;
      chart.options.plugins.zoom.pan.mode =
        isPanZoomEnabled && panState ? "x" : false;
      chart.options.plugins.zoom.zoom.wheel.enabled =
        isPanZoomEnabled && zoomState;
      chart.options.plugins.zoom.zoom.pinch.enabled =
        isPanZoomEnabled && zoomState;
      chart.options.plugins.zoom.zoom.mode =
        isPanZoomEnabled && zoomState ? "x" : false;

      // Mutate event handlers based on ROI mode
      chart.options.events = defineROI
        ? ["mousedown", "mousemove", "mouseup", "mouseout"]
        : isPanZoomEnabled
        ? [
            "mousedown",
            "mousemove",
            "mouseup",
            "mouseout",
            "click",
            "touchstart",
            "touchmove",
            "wheel",
          ]
        : ["mousemove", "mouseout", "click", "touchstart", "touchmove"];

      // Use regular update() to reinitialize zoom plugin event handlers
      // This is necessary for pan/zoom to work properly when enabled
      chart.update();
    }, [
      defineROI,
      enablePanZoom,
      panState,
      zoomState,
      decimationEnabled,
      decimationSamples,
    ]);

    // Mutate annotation options in place for ROI and burst visualizations
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart) return;

      // Build annotations object
      const allRoiAnnotations = {};

      // Add ROI boxes from roiList
      if (Array.isArray(roiList)) {
        roiList.forEach((roi, idx) => {
          if (roi && roi.xMin !== undefined && roi.xMax !== undefined) {
            const color = roiColors[idx % roiColors.length];
            const yMin =
              roi.yMin !== null && roi.yMin !== undefined
                ? roi.yMin
                : chart.scales.y.min;
            const yMax =
              roi.yMax !== null && roi.yMax !== undefined
                ? roi.yMax
                : chart.scales.y.max;

            allRoiAnnotations[`roi${idx + 1}`] = {
              type: "box",
              xMin: roi.xMin,
              xMax: roi.xMax,
              yMin: yMin,
              yMax: yMax,
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

      // Mutate annotations in place
      chart.options.plugins.annotation.annotations = allRoiAnnotations;
      chart.update("none");
    }, [
      roiList,
      showBursts,
      burstResults,
      roiAnnotation,
      roiColors,
      localMaxY,
    ]);

    // Mouse event handlers for ROI selection (only active if defineROI is true and currentRoiIndex is set)
    const handleMouseDown = (event) => {
      if (!defineROI || currentRoiIndex === null) return;
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
        if (!defineROI || !isSelectingROI || currentRoiIndex === null) return;
        const chart = neuralGraphRef.current;
        if (!chart) return;
        const rect = chart.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        setRoiEnd(x);

        // Draw annotation box dynamically with color based on currentRoiIndex
        const xMin = Math.min(roiStart, x);
        const xMax = Math.max(roiStart, x);
        const yMin = chart.scales.y.min;
        const yMax = chart.scales.y.max;
        const xMinVal = chart.scales.x.getValueForPixel(xMin);
        const xMaxVal = chart.scales.x.getValueForPixel(xMax);

        // Use the color for the current ROI being defined
        const currentColor =
          currentRoiIndex !== null
            ? roiColors[currentRoiIndex % roiColors.length]
            : roiColors[0]; // Fallback to first color

        setRoiAnnotation({
          type: "box",
          xMin: xMinVal,
          xMax: xMaxVal,
          yMin,
          yMax,
          backgroundColor: currentColor.bg,
          borderColor: currentColor.border,
          borderWidth: 2,
        });
        setAnnotationKey((k) => k + 1); // force re-render
      },
      [defineROI, isSelectingROI, roiStart, currentRoiIndex, roiColors]
    );

    const handleMouseUp = (event) => {
      if (!defineROI || !isSelectingROI) return;
      setIsSelectingROI(false);
      
      // Only process ROI if currentRoiIndex is set
      if (currentRoiIndex === null) {
        // Clear any temporary annotation
        setRoiAnnotation(null);
        setAnnotationKey((k) => k + 1);
        return;
      }
      
      const chart = neuralGraphRef.current;
      if (!chart) return;
      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      let xMin = Math.min(roiStart, x);
      let xMax = Math.max(roiStart, x);
      // Convert to data values
      let xMinVal = chart.scales.x.getValueForPixel(xMin);
      let xMaxVal = chart.scales.x.getValueForPixel(xMax);

      // Use the color for the current ROI being defined
      const currentColor = roiColors[currentRoiIndex % roiColors.length];

      // Add ROI to list and clear currentRoiIndex
      if (
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
        // Clear temporary annotation since it's now in roiList
        setRoiAnnotation(null);
        setAnnotationKey((k) => k + 1);
      }
    };

    useImperativeHandle(ref, () => ({
      resetZoom() {
        if (neuralGraphRef.current) {
          neuralGraphRef.current.resetZoom();
        }
      },
    }));

    return (
      <>
        {selectedWell && chartData ? (
          <Line
            className={className}
            data={chartData}
            options={chartOptions}
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

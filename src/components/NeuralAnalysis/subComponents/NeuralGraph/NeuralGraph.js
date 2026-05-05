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
import { Line } from "react-chartjs-2";
import {
  useNeuralInteraction,
  useNeuralResults,
  useNeuralSelection,
  useNeuralSettings,
} from "../../NeuralProvider";
import { DataContext } from "../../../../providers/DataProvider";
import { perf } from "../../utilities/perfLogger";
import { Chart, registerables, Tooltip } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(...registerables, Tooltip, zoomPlugin, annotationPlugin);

/**
 * NeuralGraph — chart.js Line wrapper. After Tier B reads everything from
 * the four narrower contexts:
 *   - selectedWell    → NeuralSelectionContext
 *   - settings (noise/decimation/spike-display) → NeuralSettingsContext
 *   - interaction (ROI list, pan/zoom mode)     → NeuralInteractionContext
 *   - pipelineResults (processedSignal, spikes, bursts) → NeuralResultsContext
 *
 * Only the imperative chart-instance ref is forwarded from the parent
 * (NeuralAnalysisModal) so it can call resetZoom() from elsewhere.
 *
 * `className` stays as a prop for layout flexibility.
 */
const NeuralGraph = forwardRef(({ className }, ref) => {
    const { selectedWell } = useNeuralSelection();
    const {
      noiseSuppressionActive,
      decimationEnabled,
      decimationSamples,
      showBursts,
    } = useNeuralSettings();
    const {
      defineROI,
      enablePanZoom,
      zoomState,
      panState,
      roiList,
      setRoiList,
      currentRoiIndex,
      setCurrentRoiIndex,
    } = useNeuralInteraction();
    const { pipelineResults } = useNeuralResults();
    const processedSignal = pipelineResults.processedSignal;
    const peakResults = pipelineResults.spikeResults;
    const burstResults = pipelineResults.burstResults;
    const { globalMaxY } = useContext(DataContext);
    const [chartData, setChartData] = useState(null);
    // ROI selection state. roiEnd / annotationKey are set during click-drag
    // for their re-render side-effect only — the values themselves are not
    // read anywhere, so we discard the value half of the tuple.
    const [roiStart, setRoiStart] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [, setRoiEnd] = useState(null);
    const [isSelectingROI, setIsSelectingROI] = useState(false);
    const [roiAnnotation, setRoiAnnotation] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [, setAnnotationKey] = useState(0); // for forcing re-render
    // Pan/Zoom and ROI mode toggles are now props
    // zoomState, panState, defineROI, enablePanZoom, setZoomState, setPanState are now props
    // decimationEnabled is now a prop
    const neuralGraphRef = useRef(null);

    // Explicit loop instead of Math.{min,max}(...arr.map(...)) — spread
    // into a function call blows V8's argument limit on a 250K-point
    // signal. Compute y-max plus x-min/x-max in a single pass; the scales
    // config below reuses these.
    let localMaxY;
    let localMinX;
    let localMaxX;
    if (processedSignal && processedSignal.length > 0) {
      let yMax = -Infinity;
      let xMin = Infinity;
      let xMax = -Infinity;
      for (let i = 0; i < processedSignal.length; i++) {
        const pt = processedSignal[i];
        if (pt.y > yMax) yMax = pt.y;
        if (pt.x < xMin) xMin = pt.x;
        if (pt.x > xMax) xMax = pt.x;
      }
      localMaxY = isFinite(yMax) ? yMax : globalMaxY;
      localMinX = isFinite(xMin) ? xMin : undefined;
      localMaxX = isFinite(xMax) ? xMax : undefined;
    } else {
      localMaxY = globalMaxY;
      localMinX = undefined;
      localMaxX = undefined;
    }

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

    // Memoized chart-data projections. Each useMemo skips its allocation
    // when its single source of truth is reference-stable across renders
    // — critical because spike-prominence drags trigger pipeline re-runs
    // that change peakResults but reuse the same processedSignal (Tier E
    // cache hits upstream stages), so we should NOT re-allocate the
    // 250K-element chartPoints just because peakResults updated.
    const chartPoints = useMemo(
      () =>
        processedSignal && processedSignal.length > 0
          ? processedSignal.map((pt) => ({ x: pt.x, y: pt.y }))
          : [],
      [processedSignal]
    );
    const peakScatter = useMemo(
      () =>
        Array.isArray(peakResults) && peakResults.length > 0
          ? peakResults.map((pk) => ({
              x: pk.peakCoords.x,
              y: pk.peakCoords.y,
            }))
          : [],
      [peakResults]
    );
    const baseScatter = useMemo(
      () =>
        Array.isArray(peakResults) && peakResults.length > 0
          ? peakResults.flatMap((pk) => [
              { x: pk.leftBaseCoords.x, y: pk.leftBaseCoords.y },
              { x: pk.rightBaseCoords.x, y: pk.rightBaseCoords.y },
            ])
          : [],
      [peakResults]
    );

    // Update chart data imperatively to preserve zoom state.
    //
    // `chartData` is in the deps because the Chart component only mounts
    // when chartData is truthy (see render below). On the first pipeline
    // result, the initializer effect above transitions chartData
    // null → set; the Chart then mounts on the next render. We need to
    // re-fire this effect at that point so it finds neuralGraphRef.current
    // populated and can write the full datasets (including spike scatter).
    // Without `chartData` here, the first set of spikes never gets
    // imperatively applied — the chart shows the basic Neural Data line
    // from chartData but no spikes until the user adjusts a slider.
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart || !processedSignal || processedSignal.length === 0) return;

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
      perf.time("chart.update (data)", () => chart.update("none"));
    }, [processedSignal, noiseSuppressionActive, chartPoints, peakScatter, baseScatter, chartData]);

    // Memoize chartOptions - recalculate when processedSignal changes to update axis ranges
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
          padding: { left: 10, right: 10, top: 10, bottom: 10 },
        },
        scales: {
          x: {
            type: "linear",
            grace: 10,
            min: localMinX,
            max: localMaxX,
            ticks: {
              display: true,
              color: "#666666",
              font: {
                size: 11,
                family: "'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
              },
              maxRotation: 0,
              autoSkipPadding: 10,
            },
            grid: { display: false },
            border: { display: true, color: "#333333", width: 1 },
            title: {
              display: true,
              text: "Time (ms)",
              color: "#333333",
              font: {
                size: 14,
                weight: "bold",
                family: "'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
              },
              padding: { top: 8 },
            },
          },
          y: {
            ticks: {
              display: true,
              color: "#666666",
              font: {
                size: 11,
                family: "'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
              },
              maxTicksLimit: 8,
            },
            grid: { display: false },
            border: { display: true, color: "#333333", width: 1 },
            title: {
              display: true,
              text: "Signal Intensity",
              color: "#333333",
              font: {
                size: 14,
                weight: "bold",
                family: "'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
              },
              padding: { bottom: 8 },
            },
          },
          yRight: {
            position: "right",
            ticks: { display: false },
            grid: { display: false },
            border: { display: true, color: "#333333", width: 1 },
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
      // Intentional: the dynamic options (decimation, pan/zoom, events,
      // initialPanZoomEnabled, localMinX/MaxX) are mutated in place on
      // chart.options by the effect below. Including them in the deps
      // here would cause useMemo to recompute the entire options object,
      // which would force chart.js to re-create the chart instance and
      // lose the user's current zoom/pan state. Recompute only when the
      // signal axes actually shift (i.e. when processedSignal changes).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [processedSignal]
    );

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
      perf.time("chart.update (full)", () => chart.update());
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
      perf.time("chart.update (annotations)", () => chart.update("none"));
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

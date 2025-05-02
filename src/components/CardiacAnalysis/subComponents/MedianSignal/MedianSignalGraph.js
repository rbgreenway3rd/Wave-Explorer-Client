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
// import usePrepareChartData from "../../utilities/PrepareChartData";
// import { getChartOptions } from "./ChartOptions";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  calculateAverageSignal,
  calculateMedianSignal,
} from "../../utilities/CalculateMedianSignal";
import "./MedianSignalGraph.css";
import { applyMedianFilter } from "../../utilities/MedianFilter";
import { findPeaksMedian, findPeaks } from "../../utilities/PeakFinder";
import {
  calculateAPDValues,
  findBaselineAndPeak,
} from "../../utilities/CalculateAPD";
import { IconButton } from "@mui/material";
import { AddAPhotoTwoTone } from "@mui/icons-material";
import { handleScreenshot } from "../../../../utilities/Handlers";

Chart.register(...registerables, Tooltip, zoomPlugin);

export const MedianSignalGraph = () => {
  const {
    selectedWell,
    peakResults,
    findPeaksWindowWidth,
    baselineData,
    peakProminence,
    prominenceFactor,
    filteredMedianSignal,
    apdValues,
    baseline,
    peak,
  } = useContext(AnalysisContext);
  const { extractedIndicatorTimes } = useContext(DataContext);

  const averageSignalGraphRef = useRef(null);

  const [showAPDSegments, setShowAPDSegments] = useState(true);

  let indicatorTimes = Object.values(extractedIndicatorTimes);

  // Ensure selectedWell and peakResults are valid before calculating the average signal
  let averageSignal = null;
  let medianSignal = null;
  if (baselineData && Array.isArray(peakResults) && peakResults.length > 0) {
    averageSignal = calculateAverageSignal(
      baselineData,
      peakResults,
      findPeaksWindowWidth
    );
    // console.log(averageSignal);
    medianSignal = calculateMedianSignal(
      baselineData,
      peakResults,
      findPeaksWindowWidth
    );
  }

  const medianSignalTimes =
    medianSignal != null ? medianSignal.map((point) => point.x) : [];

  const apdScatterPoints = Object.values(apdValues).flatMap((apd) => {
    if (apd.start && apd.end) {
      return [apd.start, apd.end]; // Include both start and end points
    }
    return [];
  });
  // console.log("apd scatter: ", apdScatterPoints);

  // Construct the "APD Segments" dataset
  // Construct the "APD Segments" datasets
  const apdSegmentDatasets = Object.entries(apdValues)
    .filter(([key, apd]) => apd.start && apd.end) // Ensure both start and end exist
    .map(([key, apd]) => ({
      label: `APD Segment`, // Label for the segment
      data: [
        { x: apd.start.x, y: apd.start.y }, // Start point
        { x: apd.end.x, y: apd.end.y }, // End point
      ],
      borderColor: "rgb(255, 0, 0)", // Red color for the segments
      borderWidth: 1.5,
      fill: false,
      type: "line",
      pointRadius: 0, // Hide points
      showLine: showAPDSegments,
    }));

  // Construct the vertical line dataset
  const apdEndPoints = Object.values(apdValues)
    .filter((apd) => apd.end) // Ensure the end point exists
    .map((apd) => apd.end);

  const verticalLineDataset = {
    label: "Rise Midpoint",
    data: apdEndPoints.sort((a, b) => a.y - b.y), // Sort by y-value to ensure a continuous vertical line
    borderColor: "rgb(190, 0, 0)", // Green color for the vertical line
    borderWidth: 1.5,
    fill: false,
    type: "line",
    pointRadius: 0, // Hide points
    showLine: showAPDSegments, // Always show the line
  };

  useEffect(() => {
    if (
      !baselineData ||
      !Array.isArray(peakResults) ||
      peakResults.length === 0
    ) {
      return;
    }

    const medianSignal = calculateMedianSignal(
      baselineData,
      peakResults,
      findPeaksWindowWidth
    );

    const filteredSignal = applyMedianFilter(medianSignal, 3);

    const peaks = findPeaks(
      filteredSignal,
      peakProminence,
      findPeaksWindowWidth
    );

    // Update state or perform additional calculations
  }, [
    baselineData,
    peakResults,
    findPeaksWindowWidth,
    peakProminence,
    prominenceFactor,
  ]); // Add prominenceFactor as a dependency

  return (
    <div className="average-signal-graph" ref={averageSignalGraphRef}>
      {selectedWell ? (
        <>
          <div className="average-signal-container-header">
            <h3 style={{ margin: 0, borderBottom: "solid black 1px" }}>
              {/* Median Signal from Well {selectedWell.key} */}
              Median Curve from Well {selectedWell.key}{" "}
              <IconButton
                onClick={() => handleScreenshot(averageSignalGraphRef)}
              >
                <AddAPhotoTwoTone
                  sx={{
                    fontSize: "0.75em",
                  }}
                />
              </IconButton>
              {/* <section style={{ margin: 0, fontSize: "0.7em" }}>
                avg time between peaks:{" "}
                {averageTimeBetweenPeaks(peakResults).toFixed(2)}ms
              </section> */}
            </h3>
            <section className="average-signal-apd-values-container">
              <label>
                <input
                  type="checkbox"
                  checked={showAPDSegments}
                  onChange={(e) => setShowAPDSegments(e.target.checked)} // Update state based on checkbox
                />
                Show APD Segments
              </label>
              {/* <h4 style={{ margin: 0 }}>APD Values:</h4> */}
              <ul className="average-signal-apd-values">
                {Object.entries(apdValues).map(([key, apd]) => (
                  <li key={key} className="apd-value">
                    <strong>{key}:</strong>{" "}
                    {apd.value !== null ? (
                      <>
                        : {apd.value.toFixed(2)} ms
                        {/* Start: (
                        {apd.start.x.toFixed(2)}, {apd.start.y.toFixed(2)}),
                        End: ({apd.end.x.toFixed(2)}, {apd.end.y.toFixed(2)}) */}
                      </>
                    ) : (
                      "Not available"
                    )}
                  </li>
                ))}
              </ul>
            </section>
            {/* <div># of Peaks: {peakResults.length}</div> */}
          </div>

          <Line
            // className="average-signal-graph"
            data={
              // data={preparedChartData}
              {
                labels: indicatorTimes[0],
                datasets: [
                  //   {
                  //     label: "Average Signal",
                  //     data: averageSignal,
                  //     borderColor: "rgb(255, 99, 132)",
                  //     tension: 0.1,
                  //     borderWidth: 1,
                  //     fill: false,
                  //     type: "line",
                  //   },
                  // {
                  //   label: "Median Signal",
                  //   data: medianSignal,
                  //   borderColor: "rgb(104, 255, 99)",
                  //   tension: 0.1,
                  //   borderWidth: 1,
                  //   fill: false,
                  //   type: "line",
                  // },
                  {
                    label: "Baseline & Peak",
                    data: [baseline],
                    borderColor: "rgb(255, 255, 255)",
                    backgroundColor: "rgb(10, 50, 251)",
                    pointRadius: 4,
                    type: "scatter",
                  },
                  {
                    label: "APD Points",
                    data: showAPDSegments ? apdScatterPoints : [],
                    borderColor: "rgb(255, 255, 255)",
                    backgroundColor: "rgb(190, 0, 0)",
                    pointRadius: 3,
                    type: "scatter",
                    // showLine: showAPDSegments,
                  },
                  {
                    label: "peak",
                    data: [peak],
                    borderColor: "rgb(255, 255, 255)",
                    backgroundColor: "rgb(10, 50, 251)",
                    pointRadius: 4,
                    type: "scatter",
                  },
                  {
                    label: "Median Signal",
                    data: filteredMedianSignal,
                    borderColor: "rgb(255, 217, 1)",
                    backgroundColor: "rgb(255, 217, 1)",
                    tension: 0.1,
                    borderWidth: 1,
                    fill: false,
                    type: "line",
                  },
                  // {
                  //   label: "APD Segments",
                  //   data: apdSegmentDatasets, // Flattened array of points
                  //   borderColor: "rgb(255, 0, 0)", // Red color for the segments
                  //   borderWidth: 1.5,
                  //   fill: false,
                  //   type: "line",
                  //   spanGaps: false, // Ensure gaps between segments are respected
                  //   pointRadius: 0, // Hide points
                  // },

                  ...apdSegmentDatasets,
                  verticalLineDataset,
                ],
              }
            }
            options={{
              normalized: false,
              maintainAspectRatio: true,
              responsive: true,
              devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

              spanGaps: false,
              events: [
                "mousemove",
                "mouseout",
                "click",
                "touchstart",
                "touchmove",
              ],
              animation: {
                duration: 0,
              },
              parsing: true,
              plugins: {
                legend: {
                  display: true,
                  labels: {
                    color: "white",
                    font: { size: 10.5, weight: "lighter" },
                    filter: (legendItem, chartData) => {
                      // Exclude datasets with the label "vertical" from the legend
                      const excludedLabels = [
                        "Rise Midpoint",
                        "peak",
                        "APD Segment",
                      ];
                      return !excludedLabels.includes(legendItem.text);
                    },
                  },
                },
                decimation: {
                  enabled: false,
                  algorithm: "lttb",
                  samples: 40,
                  threshold: 80,
                },
                tooltip: {
                  enabled: true, // set to FALSE if using an external function for tooltip
                  mode: "nearest",
                  intersect: true,
                  titleFont: {
                    size: 14,
                    weight: "bold",
                    color: "#fff",
                  },
                  // callbacks: {
                  //   title: function () {
                  //     // Return an empty string to remove the title
                  //     return "";
                  //   },
                  //   label: function (context) {
                  //     const excludedLabels = ["Filtered Median Signal"]; // Add any other labels you want to exclude
                  //     if (excludedLabels.includes(context.dataset.label)) {
                  //       return null; // Exclude this dataset from the tooltip
                  //     }

                  //     let label = context.dataset.label || "";

                  //     if (label) {
                  //       label += ": ";
                  //     }
                  //     if (
                  //       context.parsed.x !== null &&
                  //       context.parsed.y !== null
                  //     ) {
                  //       label += `X: ${context.parsed.x.toFixed(
                  //         2
                  //       )}, Y: ${context.parsed.y.toFixed(2)}`;
                  //     }
                  //     return label;
                  //   },
                  // },
                  callbacks: {
                    title: function () {
                      // Return an empty string to remove the title
                      return "";
                    },
                    label: function (context) {
                      const datasetLabel = context.dataset.label || "";
                      const x = context.parsed.x;
                      const y = context.parsed.y;
                      const excludedLabels = [
                        "Filtered Median Signal",
                        "Median Signal",
                        "Rise Midpoint",
                      ];
                      if (excludedLabels.includes(context.dataset.label)) {
                        return null; // Exclude this dataset from the tooltip
                      }
                      if (datasetLabel === "APD Points") {
                        // Find the corresponding entry in apdValues
                        const matchingAPD = Object.entries(apdValues).find(
                          ([key, apd]) => {
                            return (
                              (apd.start &&
                                apd.start.x === x &&
                                apd.start.y === y) ||
                              (apd.end && apd.end.x === x && apd.end.y === y)
                            );
                          }
                        );

                        if (matchingAPD) {
                          const [key, apd] = matchingAPD;
                          return `(${key}): X: ${x.toFixed(2)}, Y: ${y.toFixed(
                            2
                          )}, Value: ${apd.value.toFixed(2)} ms`;
                        }
                      }

                      // Default tooltip for other datasets
                      return `${datasetLabel}: X: ${x.toFixed(
                        2
                      )}, Y: ${y.toFixed(2)}`;
                    },
                  },
                },
              },
              elements: {
                point: {
                  radius: 1,
                },
                line: {
                  borderWidth: 1.5,
                },
              },
              // layout: {
              //   autoPadding: true,
              //   padding: {
              //     // left: -30,
              //     // bottom: -30,
              //   },
              // },
              scales: {
                x: {
                  type: "linear",
                  position: "bottom",
                  min: Math.min(...medianSignalTimes),
                  max: Math.max(...medianSignalTimes),

                  ticks: {
                    display: true,
                    color: "white",
                    font: { size: 10 },
                  },
                  title: {
                    display: true,
                    text: "miliseconds",
                    font: { size: 10 },
                  },
                  grid: {
                    display: false,
                  },
                },
                y: {
                  ticks: {
                    display: true,
                    color: "white",
                    font: { size: 10 },
                  },
                  grid: {
                    display: false,
                  },
                  title: {
                    display: true,
                    text: "intensity",
                    font: { size: 10 },
                  },
                },
              },
            }}
            // ref={}
            style={{
              background: "rgb(0, 0, 0)",
              width: "100%",
              border: "solid rgb(100, 100, 100), 0.25em",
              //   height: "max-content",
            }}
          />
        </>
      ) : (
        <>{""}</>
      )}
    </div>
  );
};

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
import "./AverageSignalGraph.css";
import { applyMedianFilter } from "../../utilities/MedianFilter";
import { findPeaksMedian, findPeaks } from "../../utilities/PeakFinder";
import {
  calculateAPDValues,
  findBaselineAndPeak,
} from "../../utilities/CalculateAPD";

Chart.register(...registerables, Tooltip, zoomPlugin);

export const AverageSignalGraph = () => {
  const {
    selectedWell,
    peakResults,
    findPeaksWindowWidth,
    baselineData,
    peakProminence,

    filteredMedianSignal,
    apdValues,
    baseline,
    peak,
  } = useContext(AnalysisContext);
  const { extractedIndicatorTimes } = useContext(DataContext);

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
    console.log(averageSignal);
    medianSignal = calculateMedianSignal(
      baselineData,
      peakResults,
      findPeaksWindowWidth
    );
  }

  const medianSignalTimes =
    medianSignal != null ? medianSignal.map((point) => point.x) : [];

  // let filteredMedianSignal = medianSignal
  //   ? applyMedianFilter(medianSignal, 3)
  //   : [];

  //   let medianPeaksFound = filteredMedianSignal
  //     ? findPeaksMedian(
  //         filteredMedianSignal,
  //         peakProminence,
  //         findPeaksWindowWidth
  //       )
  //     : [];
  //   let peaksFound = filteredMedianSignal
  //     ? findPeaks(filteredMedianSignal, peakProminence, findPeaksWindowWidth)
  //     : [];

  //   let peakToGraph = medianPeaksFound[0];
  //   console.log(peakToGraph.peakCoords);

  // const { baseline, peak } = filteredMedianSignal
  //   ? findBaselineAndPeak(filteredMedianSignal)
  //   : [];
  // const apdValues =
  //   baseline && peak
  //     ? calculateAPDValues(
  //         filteredMedianSignal,
  //         baseline,
  //         peak,
  //         [10, 20, 30, 40, 50, 60, 70, 80, 90]
  //       )
  //     : [];
  console.log("APD Values:", apdValues);
  console.log("Baseline:", baseline);
  console.log("Peak:", peak);
  // Extract APD points for scatter plot
  const apdScatterPoints = Object.values(apdValues).flatMap((apd) => {
    if (apd.start && apd.end) {
      return [apd.start, apd.end]; // Include both start and end points
    }
    return [];
  });

  let averageTimeBetweenPeaks = (peakResults) => {
    let timeBetweenPeaks = [];
    for (let i = 1; i < peakResults.length; i++) {
      timeBetweenPeaks.push(
        peakResults[i].peakCoords.x - peakResults[i - 1].peakCoords.x
      );
    }
    return (
      timeBetweenPeaks.reduce((a, b) => a + b, 0) / timeBetweenPeaks.length
    );
  };

  return (
    <div className="average-signal-graph">
      {selectedWell ? (
        <>
          <div className="average-signal-container-header">
            <h3 style={{ margin: 0, borderBottom: "solid black 1px" }}>
              {/* Median Signal from Well {selectedWell.key} */}
              Median Curve from Well {selectedWell.key}
              {/* <section style={{ margin: 0, fontSize: "0.7em" }}>
                avg time between peaks:{" "}
                {averageTimeBetweenPeaks(peakResults).toFixed(2)}ms
              </section> */}
            </h3>
            <section className="average-signal-apd-values-container">
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
                  //   {
                  //     label: "Median Signal",
                  //     data: medianSignal,
                  //     borderColor: "rgb(104, 255, 99)",
                  //     tension: 0.1,
                  //     borderWidth: 1,
                  //     fill: false,
                  //     type: "line",
                  //   },
                  {
                    label: "Filtered Median Signal",
                    data: filteredMedianSignal,
                    borderColor: "rgb(255, 217, 1)",
                    tension: 0.1,
                    borderWidth: 1,
                    fill: false,
                    type: "line",
                  },
                  {
                    label: "APD Points",
                    data: apdScatterPoints,
                    borderColor: "rgb(255, 255, 255)",
                    backgroundColor: "rgb(42, 251, 10)",
                    pointRadius: 3,
                    type: "scatter",
                  },
                  {
                    label: "baseline",
                    data: [baseline],
                    borderColor: "rgb(255, 255, 255)",
                    backgroundColor: "rgb(10, 50, 251)",
                    pointRadius: 4,
                    type: "scatter",
                  },
                  {
                    label: "peak",
                    data: [peak],
                    borderColor: "rgb(255, 255, 255)",
                    backgroundColor: "rgb(10, 50, 251)",
                    pointRadius: 4,
                    type: "scatter",
                  },
                ],
              }
            }
            options={{
              normalized: false,
              maintainAspectRatio: true,
              responsive: true,
              devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

              spanGaps: false,
              events: ["onHover"],
              animation: {
                duration: 0,
              },
              parsing: true,
              plugins: {
                legend: true,
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

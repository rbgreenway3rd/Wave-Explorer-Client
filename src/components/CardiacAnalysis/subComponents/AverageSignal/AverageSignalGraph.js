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
} from "../../utilities/CalculateAverageSignal";

import { findPeaks } from "../../utilities/PeakFinder";

Chart.register(...registerables, Tooltip, zoomPlugin);

export const AverageSignalGraph = () => {
  const { selectedWell, peakResults, findPeaksWindowWidth, baselineData } =
    useContext(AnalysisContext);
  const { extractedIndicatorTimes } = useContext(DataContext);

  let indicatorTimes = Object.values(extractedIndicatorTimes);

  // Ensure selectedWell and peakResults are valid before calculating the average signal
  let averageSignal = null;
  let medianSignal = null;
  if (baselineData && Array.isArray(peakResults) && peakResults.length > 0) {
    averageSignal = calculateAverageSignal(
      //   selectedWell,
      baselineData,
      peakResults,
      findPeaksWindowWidth
    );
    console.log(averageSignal);
    medianSignal = calculateMedianSignal(
      //   selectedWell,
      baselineData,
      peakResults,
      findPeaksWindowWidth
    );
    console.log(medianSignal);
  }
  console.log(peakResults);
  const averageSignalTimes =
    averageSignal != null ? averageSignal.map((point) => point.x) : [];

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
    <div>
      avg curve:
      <Line
        className="average-signal-graph"
        data={
          // data={preparedChartData}
          {
            labels: indicatorTimes[0],
            datasets: [
              {
                label: "Average Signal",
                data: averageSignal,
                borderColor: "rgb(255, 99, 132)",
                tension: 0.1,
                borderWidth: 1,
                fill: false,
                type: "line",
              },
              {
                label: "Median Signal",
                data: medianSignal,
                borderColor: "rgb(104, 255, 99)",
                tension: 0.1,
                borderWidth: 1,
                fill: false,
                type: "line",
              },
            ],
          }
        }
        options={{
          // normalized: true,
          maintainAspectRatio: true,
          responsive: true,
          devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

          spanGaps: false,
          events: ["onHover"],
          animation: {
            duration: 0,
          },
          parsing: false,
          plugins: {
            legend: false,
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
              min: Math.min(...averageSignalTimes),
              max: Math.max(...averageSignalTimes),

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
        }}
      />
      <section>
        average time between peaks:{" "}
        {averageTimeBetweenPeaks(peakResults).toFixed(2)}ms
      </section>
    </div>
  );
};

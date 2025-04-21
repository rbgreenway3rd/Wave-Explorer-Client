import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useContext,
} from "react";
import "../../../styles/LargeGraph.css";
import { Line } from "react-chartjs-2";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { DataContext } from "../../../providers/DataProvider";
import html2canvas from "html2canvas";

Chart.register(zoomPlugin);

export const LargeGraph = forwardRef(
  ({ rawGraphData, filteredGraphData, largeGraphConfig }, ref) => {
    const { wellArrays, overlayRawAndFiltered } = useContext(DataContext);

    const componentRef = useRef(null);

    const chartRef = useRef(null);

    const [largeCanvasWidth, setLargeCanvasWidth] = useState(
      window.innerWidth / 2.3
      // window.innerWidth / 2.5
    );
    const [largeCanvasHeight, setLargeCanvasHeight] = useState(
      window.innerHeight / 2.3
      // window.innerHeight / 2.5
    );
    const [smallCanvasWidth, setSmallCanvasWidth] = useState(
      window.innerWidth / 64.4
      // window.innerWidth / 70
    );
    const [smallCanvasHeight, setSmallCanvasHeight] = useState(
      window.innerHeight / 46
      // window.innerHeight / 50
    );

    const handleResize = () => {
      // setLargeCanvasWidth(window.innerWidth / 2.5);
      // setLargeCanvasHeight(window.innerHeight / 2.5);
      // setSmallCanvasWidth(window.innerWidth / 70);
      // setSmallCanvasHeight(window.innerHeight / 50);
      setLargeCanvasWidth(window.innerWidth / 2.3);
      setLargeCanvasHeight(window.innerHeight / 2.3);
      setSmallCanvasWidth(window.innerWidth / 64.4);
      setSmallCanvasHeight(window.innerHeight / 46);
    };

    // Effect to listen to window resize events
    useEffect(() => {
      window.addEventListener("resize", handleResize);

      // Cleanup event listener on component unmount
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, []);

    // Expose resetZoom function to parent via ref
    useImperativeHandle(ref, () => ({
      resetZoom() {
        if (chartRef.current) {
          chartRef.current.resetZoom();
        }
      },
    }));

    const handleDownload = async () => {
      if (componentRef.current) {
        const canvas = await html2canvas(componentRef.current);
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = "component.png";
        link.click();
      }
    };

    const combinedGraphData = {
      ...rawGraphData,
      datasets: overlayRawAndFiltered
        ? [
            ...filteredGraphData.datasets.map((dataset) => ({
              ...dataset,
              borderColor: "rgba(255, 99, 132, 1)", // Red for filtered data
              backgroundColor: "rgba(255, 99, 132, 0.2)", // Light red for fill
            })),
            ...rawGraphData.datasets.map((dataset) => ({
              ...dataset,
              borderColor: "rgba(75, 192, 192, 1)", // Teal for raw data
              backgroundColor: "rgba(75, 192, 192, 0.2)", // Light teal for fill
            })),
          ]
        : rawGraphData.datasets,
    };

    return (
      // <div ref={componentRef}>
      <Line
        key={JSON.stringify(rawGraphData)}
        className="large-graph-canvas"
        // data={rawGraphData}
        data={combinedGraphData}
        options={largeGraphConfig}
        ref={chartRef}
        width={largeCanvasWidth}
        height={largeCanvasHeight}

        // style={{ border: "solid 0.5em black" }}
      />
      // </div>
    );
  }
);

export default LargeGraph;

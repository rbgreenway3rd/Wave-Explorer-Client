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

Chart.register(zoomPlugin);

export const LargeGraph = forwardRef(
  ({ rawGraphData, largeGraphConfig }, ref) => {
    const chartRef = useRef(null);

    const [largeCanvasWidth, setLargeCanvasWidth] = useState(
      // window.innerWidth / 2.2
      window.innerWidth / 2.5
    );
    const [largeCanvasHeight, setLargeCanvasHeight] = useState(
      // window.innerHeight / 2.2
      window.innerHeight / 2.5
    );
    const [smallCanvasWidth, setSmallCanvasWidth] = useState(
      // window.innerWidth / 61.6
      window.innerWidth / 70
    );
    const [smallCanvasHeight, setSmallCanvasHeight] = useState(
      // window.innerHeight / 44
      window.innerHeight / 50
    );

    // Resize handler function
    const handleResize = () => {
      // setLargeCanvasWidth(window.innerWidth / 3);
      // setLargeCanvasHeight(window.innerHeight / 3);

      // setLargeCanvasWidth(window.innerWidth / 2.2);
      // setLargeCanvasHeight(window.innerHeight / 2.2);
      // setSmallCanvasWidth(window.innerWidth / 61.6);

      // setSmallCanvasHeight(window.innerHeight / 44);
      setLargeCanvasWidth(window.innerWidth / 2.5);
      setLargeCanvasHeight(window.innerHeight / 2.5);
      setSmallCanvasWidth(window.innerWidth / 70);
      setSmallCanvasHeight(window.innerHeight / 50);
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

    return (
      // <div className="large-graph">
      <Line
        key={`${largeCanvasWidth}-${largeCanvasHeight}`}
        className="large-graph-canvas"
        data={rawGraphData}
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

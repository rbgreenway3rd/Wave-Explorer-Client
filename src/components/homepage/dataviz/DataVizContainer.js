import React, { useState } from "react";
import "./DataVizContainer.css";
import MaxiGraph from "./maxigraph/MaxiGraph";
import MiniGraphs from "./minigraphs/MiniGraphs";
import { PlateImage } from "./imaging/PlateImage";
import Button from "@mui/material/Button";
import ExperimentImageDataMapping from "./imaging/ExperimentImageMapping";

export function DataVizContainer() {
  const [showData, setShowData] = useState(false);
  const [buttonText, setButtonText] = useState("Show Experiment Data");
  const showHideDiv = () => {
    if (showData === true) {
      setShowData(false);
      setButtonText("Show Experiment Data");
    } else {
      setShowData(true);
      setButtonText("Hide Experiment Data");
    }
  };

  return (
    <div className="container">
      <div className="graph__container">
        <div className="minigraphs">
          <MiniGraphs />
        </div>
        <div className="maxigraph">
          <MaxiGraph />
        </div>
      </div>
      <div className="image__container">
        <Button
          variant="contained"
          onClick={() => showHideDiv((prev) => !prev)}
          style={{
            width: "100%",
          }}
        >
          {buttonText}
        </Button>
        {showData && (
          <div className="experiment_image_data_mapping">
            <ExperimentImageDataMapping />
          </div>
        )}
      </div>
    </div>
  );
}

export default DataVizContainer;

// {
//   <div className="experiment__image__indicator__container">
//   <Button
//     variant="contained"
//     onClick={() => showHideExperimentImageIndicatorSection((prev) => !prev)}
//     style={{
//       width: "100%",
//     }}
//   >
//     {indicatorButtonText}
//   </Button>
//   {showExperimentImageIndicatorSection && (
//     <div className="plate_image">
//       <PlateImage />
//     </div>
//   )}
// </div>;
// }

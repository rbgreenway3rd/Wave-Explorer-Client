import React, { useContext, useState } from "react";
import { DataContext } from "../../../providers/DataProvider";
import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
import {
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormControl,
  FormLabel,
  Typography,
} from "@mui/material";
import "../../../styles/MiniGraphControls.css";

export const MiniGraphControls = ({
  handleToggleDataShown,
  handleToggleVisibility,
}) => {
  const {
    project,
    setProject,
    showFiltered,
    setShowFiltered,
    wellArrays,
    setWellArrays,
    updateWellArrays,
    extractedIndicators,
    handleClearSelectedWells,
  } = useContext(DataContext);
  console.log(extractedIndicators);

  const [isAnimating, setIsAnimating] = useState(false);

  const handleClickClearSelectedWells = async () => {
    await setIsAnimating(true);
    handleClearSelectedWells();
  };

  return (
    <div className="minigraph-and-controls__controls-container">
      {/* Show Raw or Filtered data radio buttons */}
      <section className="minigraph-and-controls__main-controls">
        <div className="minigraph-and-controls__show-raw-or-filtered">
          <FormControl component="fieldset">
            <FormLabel
              component="legend"
              // style={{
              //   backgroundImage:
              //     "linear-gradient( rgb(96, 127, 190, 0.25) 0%,rgb(48, 79.5, 143, 0.15) 50%, rgb(0,32,96, 0.05) 70%)",
              // }}
            >
              Data Type:
            </FormLabel>
            <RadioGroup
              row
              aria-label="data-display"
              name="radio-group-1"
              value={showFiltered ? "showFiltered" : "showRaw"}
              onChange={() => handleToggleDataShown()}
            >
              <FormControlLabel
                value="showRaw"
                control={<Radio />}
                label="Raw"
              />
              <FormControlLabel
                value="showFiltered"
                control={<Radio />}
                label="Filtered"
              />
            </RadioGroup>
          </FormControl>
        </div>

        {/* Visibility section with checkboxes for each unique indicator type */}
        <div className="minigraph-and-controls__visibility">
          <FormControl component="fieldset">
            <FormLabel
              component="legend"
              // style={{
              //   backgroundImage:
              //     "linear-gradient( rgb(96, 127, 190, 0.25) 0%,rgb(48, 79.5, 143, 0.15) 50%, rgb(0,32,96, 0.05) 70%)",
              // }}
            >
              Indicator Shown:
            </FormLabel>
            {extractedIndicators.map((indicator) => (
              <FormControlLabel
                key={indicator.id}
                control={
                  <Checkbox
                    defaultChecked
                    onChange={() => handleToggleVisibility(indicator.id)}
                  />
                }
                label={indicator.indicatorName}
              />
            ))}
          </FormControl>
        </div>
      </section>
      {/* Clear Selections button */}
      {/* <section> */}
      <Button
        variant="outlined"
        color="primary"
        className={`clear-selections-button ${
          isAnimating ? "animate-line" : ""
        }`}
        onClick={() => handleClickClearSelectedWells()}
        onAnimationEnd={() => setIsAnimating(false)} // Reset animation state
        disableRipple
      >
        <DisabledByDefaultTwoToneIcon />
        <Typography variant="h1">Clear Selections</Typography>
      </Button>
      {/* </section> */}
    </div>
  );
};

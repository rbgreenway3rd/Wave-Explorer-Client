import React, { useContext, useState } from "react";
import { DataContext } from "../../../providers/DataProvider";
import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
import {
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormControl,
  FormLabel,
} from "@mui/material";
import { Button } from "../../ui";
import "../../../styles/MiniGraphControls.css";

export const MiniGraphControls = ({
  handleToggleDataShown,
  handleToggleVisibility,
}) => {
  const { showFiltered, extractedIndicators, handleClearSelectedWells } =
    useContext(DataContext);

  const [isAnimating, setIsAnimating] = useState(false);

  const handleClickClearSelectedWells = async () => {
    await setIsAnimating(true);
    handleClearSelectedWells();
  };

  return (
    <div className="minigraph-and-controls__controls-container quadrant-controls ui-clean-forms">
      <section className="minigraph-and-controls__main-controls">
        {/* Show Raw or Filtered data radio buttons */}
        <div className="minigraph-and-controls__show-raw-or-filtered">
          <FormControl component="fieldset">
            <FormLabel component="legend">Data Type:</FormLabel>
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

        {/* Visibility section with checkboxes for each unique indicator */}
        <div className="minigraph-and-controls__visibility">
          <FormControl component="fieldset">
            <FormLabel component="legend">Indicator Shown:</FormLabel>
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

      <Button
        className={`clear-selections-button ${
          isAnimating ? "animate-line" : ""
        }`}
        variant="primary"
        block
        startIcon={<DisabledByDefaultTwoToneIcon />}
        onClick={handleClickClearSelectedWells}
        onAnimationEnd={() => setIsAnimating(false)}
      >
        Clear Selections
      </Button>
    </div>
  );
};

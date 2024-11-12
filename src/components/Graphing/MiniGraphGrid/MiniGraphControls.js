// import React, { useContext, useState } from "react";
// import { DataContext } from "../../../providers/DataProvider";
// import "../../../styles/MiniGraphControls.css";

// export const MiniGraphControls = ({ handleToggleDataShown, isFiltered }) => {
//   const {
//     project,
//     analysisData,
//     showFiltered,
//     setShowFiltered,
//     selectedWellArray,
//     handleSelectWell,
//     handleDeselectWell,
//     handleClearSelectedWells,
//   } = useContext(DataContext);

//   // Local state for managing which data to show
//   //   const [isFiltered, setIsFiltered] = useState(false); // Default is raw data (false)

//   // const plate = project?.plate || [];
//   // const experiment = plate[0]?.experiments[0] || {};
//   // const wellArrays = experiment.wells || [];

//   //   const handleToggleDataShown = () => {
//   //     setIsFiltered((prev) => !prev); // Toggle the filter state
//   //     setShowFiltered((prev) => !prev); // Update context state as well
//   //   };

//   return (
//     <div className="minigraph-and-controls__controls-container">
//       <div className="minigraph-and-controls__show-raw-or-filtered">
//         Show
//         <div className="minigraph-and-controls__show-raw">
//           <input
//             type="radio"
//             id="show-raw"
//             className="minigraph-and-controls__raw-radio"
//             value="showRaw"
//             name="radio-group-1"
//             checked={!showFiltered}
//             onChange={() => handleToggleDataShown()}
//           />
//           <label htmlFor="show-raw">Raw</label>
//         </div>
//         <div className="minigraph-and-controls__show-filtered">
//           <input
//             type="radio"
//             id="show-filtered"
//             className="minigraph-and-controls__filtered-radio"
//             value="showFiltered"
//             name="radio-group-1"
//             checked={showFiltered}
//             onChange={() => handleToggleDataShown()}
//           />
//           <label htmlFor="show-filtered">Filtered</label>
//         </div>
//       </div>
//       <div className="minigraph-and-controls__visibility">
//         Visibility
//         <div className="minigraph-and-controls__visibility-selector1">
//           <input
//             type="checkbox"
//             id="visibility-selector"
//             className="minigraph-and-controls__visibility-selector"
//             value="visibility-selector1"
//           />
//           <label htmlFor="visibility-selector">Green</label>
//         </div>
//       </div>
//       <button
//         className="clear-selections-button"
//         onClick={() => handleClearSelectedWells()}
//       >
//         Clear Selections
//       </button>
//     </div>
//   );
// };

//MATERIAL UI THEME USAGE
// import React, { useContext } from "react";
// import { DataContext } from "../../../providers/DataProvider";
// import {
//   Button,
//   Radio,
//   RadioGroup,
//   FormControlLabel,
//   Checkbox,
//   FormControl,
//   FormLabel,
// } from "@mui/material";
// import "../../../styles/MiniGraphControls.css"; // You may keep this if you need custom styling not handled by Material UI

// export const MiniGraphControls = ({ handleToggleDataShown, isFiltered }) => {
//   const {
//     project,
//     analysisData,
//     showFiltered,
//     setShowFiltered,
//     selectedWellArray,
//     handleSelectWell,
//     handleDeselectWell,
//     handleClearSelectedWells,
//   } = useContext(DataContext);

//   return (
//     <div className="minigraph-and-controls__controls-container">
//       {/* Show Raw or Filtered data radio buttons */}
//       <div className="minigraph-and-controls__show-raw-or-filtered">
//         <FormControl component="fieldset">
//           <FormLabel component="legend">Show</FormLabel>
//           <RadioGroup
//             row
//             aria-label="data-display"
//             name="radio-group-1"
//             value={showFiltered ? "showFiltered" : "showRaw"}
//             onChange={() => handleToggleDataShown()}
//           >
//             <FormControlLabel value="showRaw" control={<Radio />} label="Raw" />
//             <FormControlLabel
//               value="showFiltered"
//               control={<Radio />}
//               label="Filtered"
//             />
//           </RadioGroup>
//         </FormControl>
//       </div>

//       {/* Visibility checkbox */}
//       <div className="minigraph-and-controls__visibility">
//         <FormControl component="fieldset">
//           <FormLabel component="legend">Visibility</FormLabel>
//           <FormControlLabel
//             control={<Checkbox id="visibility-selector" />}
//             label="Green"
//           />
//         </FormControl>
//       </div>

//       {/* Clear Selections button */}
//       <Button
//         variant="contained"
//         color="secondary"
//         className="clear-selections-button"
//         onClick={() => handleClearSelectedWells()}
//       >
//         Clear Selections
//       </Button>
//     </div>
//   );
// };

// INDICATOR TOGGLING
import React, { useContext } from "react";
import { DataContext } from "../../../providers/DataProvider";
import {
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormControl,
  FormLabel,
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

  // Function to toggle the isDisplayed property for all wells of a specific indicator type
  // const handleToggleVisibility = (indicatorName) => {
  //   updateWellArrays((prevWellArrays) => {
  //     const updatedWells = prevWellArrays.map((well) => {
  //       console.log("Before update:", well); // Log each well before changes
  //       const updatedWell = {
  //         ...well,
  //         indicators: well.indicators.map((indicator) => {
  //           if (indicator.name === indicatorName) {
  //             console.log("Toggling isDisplayed for indicator:", indicator);
  //             return { ...indicator, isDisplayed: !indicator.isDisplayed };
  //           }
  //           return indicator;
  //         }),
  //       };
  //       console.log("After update:", updatedWell); // Log the well after changes
  //       return updatedWell;
  //     });
  //     console.log("Updated well arrays:", updatedWells); // Final log of all updated wells
  //     return updatedWells;
  //   });
  // };

  return (
    <div className="minigraph-and-controls__controls-container">
      {/* Show Raw or Filtered data radio buttons */}
      <div className="minigraph-and-controls__show-raw-or-filtered">
        <FormControl component="fieldset">
          <FormLabel component="legend">Show</FormLabel>
          <RadioGroup
            row
            aria-label="data-display"
            name="radio-group-1"
            value={showFiltered ? "showFiltered" : "showRaw"}
            onChange={() => handleToggleDataShown()}
          >
            <FormControlLabel value="showRaw" control={<Radio />} label="Raw" />
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
          <FormLabel component="legend">Visibility</FormLabel>
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

      {/* Clear Selections button */}
      <Button
        variant="contained"
        color="secondary"
        className="clear-selections-button"
        onClick={() => handleClearSelectedWells()}
      >
        Clear Selections
      </Button>
    </div>
  );
};

import WellSelectionModal from "./WellSelectionModal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import FilterSelectionModal from "./FilterSelectionModal";
import { FilterContext } from "./FilterContext";
import { DataContext } from "../../FileHandling/DataProvider";
import { debounce } from "lodash";
import { useCallback, useMemo, useState, useEffect, useContext } from "react";
import {
  StaticRatio_Filter,
  DynamicRatio_Filter,
  Div_Filter,
} from "./FilterModels";

export const FilterControls = ({
  wellArrays,
  onFilterUpdate,
  onSelectedWellsUpdate,
}) => {
  const [selectedWells, setSelectedWells] = useState([]);
  const [enabledFilters, setEnabledFilters] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [highlightedFilter, setHighlightedFilter] = useState({});
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState("staticRatio");

  // state for editParams dialogue
  const [openDialog, setOpenDialog] = useState(false);
  const [currentFilter, setCurrentFilter] = useState(null);
  const [startValue, setStartValue] = useState(0);
  const [endValue, setEndValue] = useState(5);
  // // //

  const { project, setProject } = useContext(DataContext);

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "80%",
    maxWidth: 800,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    display: "flex",
    flexDirection: "column",
    p: 2,
  };

  const handleEditParams = (start, end, setParams) => {
    setStartValue(start);
    setEndValue(end);
    setCurrentFilter({ setParams });
    setOpenDialog(true);
  };

  const handleSaveParams = () => {
    currentFilter.setParams(startValue, endValue);
    setOpenDialog(false);
  };

  useEffect(() => {
    console.log("Updated selectedFilters: ", selectedFilters);
  }, [selectedFilters]);

  const handleCheckboxChange = (filter) => {
    // Toggle the isEnabled value directly on the instance
    filter.setEnabled(!filter.isEnabled);

    // Update selectedFilters immutably
    const updatedSelectedFilters = selectedFilters.map((f) =>
      f.id === filter.id ? filter : f
    );

    setSelectedFilters(updatedSelectedFilters);

    // Update enabledFilters based on isEnabled
    if (filter.isEnabled) {
      setEnabledFilters((prevEnabledFilters) => [
        ...prevEnabledFilters,
        filter,
      ]);
    } else {
      setEnabledFilters((prevEnabledFilters) =>
        prevEnabledFilters.filter((f) => f.id !== filter.id)
      );
    }

    console.log(filter);
  };

  const handleFilterHighlight = (filter) => {
    if (highlightedFilter === filter) {
      setHighlightedFilter({});
    } else {
      setHighlightedFilter(filter);
    }
  };

  const toggleFilter = (filter) => {
    if (filter.isEnabled === true) {
      filter.isEnabled = false;
      console.log(filter);
      return filter;
    } else {
      filter.isEnabled = true;
      console.log(filter);
      return filter;
    }
  };

  const handleRemoveHighlightedFilter = () => {
    if (highlightedFilter && highlightedFilter.id) {
      // Set the highlighted filter's isEnabled to false
      const updatedSelectedFilters = selectedFilters.map((filter) => {
        if (filter.id === highlightedFilter.id) {
          return { ...filter, isEnabled: false };
        }
        return filter;
      });

      // Remove the highlighted filter from the selectedFilters array
      const newSelectedFilters = updatedSelectedFilters.filter(
        (filter) => filter.id !== highlightedFilter.id
      );

      // Update the selectedFilters state
      setSelectedFilters(newSelectedFilters);

      // Reset the highlighted filter
      setHighlightedFilter({});
    }
  };

  const handleChangeFilterOrderUp = () => {
    const index = selectedFilters.findIndex(
      (filter) => filter.id === highlightedFilter.id
    );

    if (index > 0) {
      // Swap the highlighted filter with the one preceding it
      const updatedFilters = [...selectedFilters];
      const temp = updatedFilters[index - 1];
      updatedFilters[index - 1] = updatedFilters[index];
      updatedFilters[index] = temp;

      setSelectedFilters(updatedFilters);
    }
  };

  const handleChangeFilterOrderDown = () => {
    const index = selectedFilters.findIndex(
      (filter) => filter.id === highlightedFilter.id
    );

    if (index < selectedFilters.length - 1) {
      // Swap the highlighted filter with the one following it
      const updatedFilters = [...selectedFilters];
      const temp = updatedFilters[index + 1];
      updatedFilters[index + 1] = updatedFilters[index];
      updatedFilters[index] = temp;

      setSelectedFilters(updatedFilters);
    }
  };

  const filterSelectedWells = (selectedCells) => {
    const newFilteredArray = wellArrays.filter((well) => {
      return selectedCells.some(
        (selectedCell) =>
          well.row === selectedCell.row && well.column === selectedCell.col
      );
    });
    setSelectedWells(newFilteredArray);
    return selectedWells;
  };

  const handleOpen = () => setOpen(true);

  const handleClose = () => setOpen(false);

  // handle adding new filters to selectedFilters list on modal close
  const handleConfirm = () => {
    setOpen(false);
    // addFilterToList(selectedValue)
    if (selectedValue === "staticRatio") {
      // create instance of static ratio filter
      const newStaticRatioFilter = new StaticRatio_Filter(
        selectedFilters.length,
        handleEditParams
      );
      // append it to filter list
      console.log(newStaticRatioFilter);
      setSelectedFilters([...selectedFilters, newStaticRatioFilter]);
    } else if (selectedValue === "dynamicRatio") {
      // create instance of dynamic ratio filter
      const newDynamicRatioFilter = new DynamicRatio_Filter(
        selectedFilters.length
      );
      // append newDynamicRatioFilter to selectedFilters array
      console.log(newDynamicRatioFilter);
      setSelectedFilters([...selectedFilters, newDynamicRatioFilter]);
    } else if (selectedValue === "divFilter") {
      // create instance of div filter
      const newDivFilter = new Div_Filter(selectedFilters.length);
      // append to selectedFilters array
      console.log(newDivFilter);
      setSelectedFilters([...selectedFilters, newDivFilter]);
    }

    // Apply the list of selected filters
  };
  // const handleConfirm = () => {
  //   setOpen(false);
  //   // addFilterToList(selectedValue)
  //   if (selectedValue === "staticRatio") {
  //     // create instance of static ratio filter
  //     const newStaticRatioFilter = new StaticRatio_Filter(
  //       selectedFilters.length,
  //       handleEditParams
  //     );
  //     // append it to filter list
  //     selectedFilters.push(newStaticRatioFilter);
  //     console.log(newStaticRatioFilter);
  //   } else if (selectedValue === "dynamicRatio") {
  //     // create instance of dynamic ratio filter
  //     const newDynamicRatioFilter = new DynamicRatio_Filter(
  //       selectedFilters.length
  //     );
  //     // append newDynamicRatioFilter to selectedFilters array
  //     selectedFilters.push(newDynamicRatioFilter);
  //     console.log(newDynamicRatioFilter);
  //   } else if (selectedValue === "divFilter") {
  //     // create instance of div filter
  //     const newDivFilter = new Div_Filter(selectedFilters.length);
  //     // append to selectedFilters array
  //     selectedFilters.push(newDivFilter);
  //     console.log(newDivFilter);
  //   }

  //   // Apply the list of selected filters
  // };

  // handle radio button check in filter selection modal
  const handleRadioCheck = (event) => {
    setSelectedValue(event.target.value);
  };

  return (
    <Box
      sx={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography variant="h5" gutterBottom>
        Filter Controls
      </Typography>
      <div className="filter-selection-buttons">
        {/* <FilterSelectionModal onFilterApply={handleFilterApply} /> */}
        <div>
          <Button onClick={handleOpen}>+</Button>
          <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={modalStyle}>
              <Typography id="modal-modal-title" variant="h6" component="h2">
                Select Filters
              </Typography>
              <Box
                sx={{
                  marginTop: 2,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="static-ratio">
                  <input
                    type="radio"
                    id="static-ratio"
                    className="static-ratio-radio"
                    value="staticRatio"
                    name="radio-group-2"
                    checked={selectedValue === "staticRatio"}
                    onChange={handleRadioCheck}
                  />
                  <label htmlFor="static-ratio">Static Ratio</label>
                </div>
                <div className="dynamic-ratio">
                  <input
                    type="radio"
                    id="dynamic-ratio"
                    className="dynamic-ratio-radio"
                    value="dynamicRatio"
                    name="radio-group-2"
                    checked={selectedValue === "dynamicRatio"}
                    onChange={handleRadioCheck}
                  />
                  <label htmlFor="dynamic-ratio">Dynamic Ratio</label>
                </div>
                <div className="div-filter">
                  <input
                    type="radio"
                    id="div-filter"
                    className="div-filter-radio"
                    value="divFilter"
                    name="radio-group-2"
                    checked={selectedValue === "divFilter"}
                    onChange={handleRadioCheck}
                  />
                  <label htmlFor="div-filter">Divide by 2</label>
                </div>
              </Box>
              <Button
                onClick={handleConfirm}
                variant="contained"
                sx={{ marginTop: 2, alignSelf: "flex-end" }}
              >
                Confirm Filter Selection
              </Button>
            </Box>
          </Modal>
        </div>
        <Button
          className="filter-order-button-up"
          onClick={handleChangeFilterOrderUp}
        >
          ^
        </Button>
        <Button
          className="filter-order-button-down"
          onClick={handleChangeFilterOrderDown}
        >
          v
        </Button>
        <Button
          className="filter-order-button-remove"
          onClick={handleRemoveHighlightedFilter}
        >
          x
        </Button>
        <div>
          <h3>Selected Filters</h3>
          {selectedFilters.length > 0 ? (
            selectedFilters.map((filter) => (
              <div
                key={filter.id}
                style={{
                  backgroundColor:
                    highlightedFilter.id === filter.id
                      ? "yellow"
                      : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={filter.isEnabled || false} // Control filter enabling/disabling
                  onChange={() => handleCheckboxChange(filter)} // Toggle filter state
                />
                <label onClick={() => handleFilterHighlight(filter)}>
                  {filter.name}
                </label>
                <button
                  className="edit-params-button"
                  onClick={() => filter.editParams()}
                >
                  ...
                </button>
              </div>
            ))
          ) : (
            <Typography variant="body2">No filters selected.</Typography>
          )}
        </div>
      </div>
      <Box sx={{ mb: 0 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setEnabledFilters([]); // Clear enabled filters on reset
            setSelectedFilters([]);
          }}
        >
          Reset Filters
        </Button>
      </Box>
      <WellSelectionModal onFilterApply={filterSelectedWells} />
      {/* Additional filter controls or components can be added here */}
      {/* Dialog for editing Static Ratio Filter parameters */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Edit Static Ratio Filter Parameters</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Adjust the start and end values for the static ratio filter.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Start Value"
            type="number"
            fullWidth
            value={startValue}
            onChange={(e) => setStartValue(Number(e.target.value))}
          />
          <TextField
            margin="dense"
            label="End Value"
            type="number"
            fullWidth
            value={endValue}
            onChange={(e) => setEndValue(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSaveParams} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FilterControls;

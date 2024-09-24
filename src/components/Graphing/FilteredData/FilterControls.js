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
import { StaticRatioModal, SmoothingFilterModal } from "./ParameterModals";
import {
  StaticRatio_Filter,
  DynamicRatio_Filter,
  Div_Filter,
  Smoothing_Filter,
} from "./FilterModels";

export const FilterControls = ({
  wellArrays,
  selectedFilters,
  setSelectedFilters,
  enabledFilters,
  setEnabledFilters,
  applyEnabledFilters,
}) => {
  const { project, setProject } = useContext(DataContext);

  const [selectedWells, setSelectedWells] = useState([]);
  // const [enabledFilters, setEnabledFilters] = useState([]);
  // const [selectedFilters, setSelectedFilters] = useState([]);
  const [highlightedFilter, setHighlightedFilter] = useState({});
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState("staticRatio");

  // state for editParams dialogue
  const [openDialog, setOpenDialog] = useState(false);
  const [currentFilter, setCurrentFilter] = useState(null);
  const [startValue, setStartValue] = useState(0);
  const [endValue, setEndValue] = useState(5);
  const [windowWidth, setWindowWidth] = useState(0);
  const [editModalType, setEditModalType] = useState(null);
  // // //

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

  // const handleEditParams = (start, end, setParams) => {
  //   setStartValue(start);
  //   setEndValue(end);
  //   setCurrentFilter({ setParams });
  //   setOpenDialog(true);
  // };

  const handleEditStaticRatioParams = (start, end, setParams) => {
    setStartValue(start);
    setEndValue(end);
    setCurrentFilter({ setParams });
    setEditModalType("staticRatio");
    setOpenDialog(true);
  };

  const handleEditDynamicRatioParams = (setParams) => {
    // Dynamic Ratio filter
  };

  const handleEditDivFilterParams = (setParams) => {
    //  Div Filter
  };

  const handleEditSmoothingFilterParams = (windowWidth, setParams) => {
    setWindowWidth(windowWidth);
    setCurrentFilter({ setParams });
    setEditModalType("smoothingFilter");
    setOpenDialog(true);

    console.log(currentFilter);
  };

  const handleSaveParams = () => {
    // Save logic depending on the filter type
    if (editModalType === "staticRatio") {
      currentFilter.setParams(startValue, endValue);
    } else if (editModalType === "smoothingFilter") {
      currentFilter.setParams(windowWidth);
    }
    // Other filter types...
    setOpenDialog(false);
  };

  // const handleSaveParams = () => {
  //   currentFilter.setParams(startValue, endValue);
  //   setOpenDialog(false);
  // };

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
    // console.log("enabledFilters: ", enabledFilters);
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
          filter.setEnabled(!filter.isEnabled);
        }
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
        handleEditStaticRatioParams
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
    } else if (selectedValue === "smoothingFilter") {
      // create instance of smoothing filter
      const newSmoothingFilter = new Smoothing_Filter(
        selectedFilters.length,
        handleEditSmoothingFilterParams
      ); // need to figure out how to initialize windowWidth
      // append newSmoothingFilter to selectedFilters array
      console.log(newSmoothingFilter);
      setSelectedFilters([...selectedFilters, newSmoothingFilter]);
    }

    // Apply the list of selected filters
  };

  // handle radio button check in filter selection modal
  const handleRadioCheck = (event) => {
    setSelectedValue(event.target.value);
  };

  // return (
  //   <Box
  //     sx={{
  //       padding: 0,
  //       display: "flex",
  //       flexDirection: "column",
  //       alignItems: "center",
  //       width: "100%",
  //     }}
  //   >
  //     {/* Apply Filters Button */}
  //     <Button
  //       variant="contained"
  //       color="primary"
  //       onClick={applyEnabledFilters}
  //       sx={{ mb: 2 }}
  //     >
  //       Apply Filters
  //     </Button>

  //     <div className="filter-selection-controls" style={{ width: "100%" }}>
  //       {/* Modal Trigger for Adding Filters */}
  //       <Button onClick={handleOpen} variant="outlined" color="primary">
  //         + Add Filter
  //       </Button>

  //       {/* Order Up Button */}
  //       <Button
  //         className="filter-order-button-up"
  //         onClick={handleChangeFilterOrderUp}
  //         variant="outlined"
  //         sx={{ ml: 1 }}
  //       >
  //         ↑
  //       </Button>

  //       {/* Remove Filter Button */}
  //       <Button
  //         className="filter-order-button-remove"
  //         onClick={handleRemoveHighlightedFilter}
  //         variant="outlined"
  //         color="error"
  //         sx={{ ml: 1 }}
  //       >
  //         x Remove Filter
  //       </Button>

  //       {/* Order Down Button */}
  //       <Button
  //         className="filter-order-button-down"
  //         onClick={handleChangeFilterOrderDown}
  //         variant="outlined"
  //         sx={{ ml: 1 }}
  //       >
  //         ↓
  //       </Button>
  //     </div>

  //     {/* Selected Filters List */}
  //     <Box
  //       sx={{
  //         width: "100%",
  //         mt: 3,
  //         border: "1px solid #ccc",
  //         borderRadius: 2,
  //         padding: 2,
  //       }}
  //     >
  //       <Typography variant="h6">Selected Filters</Typography>
  //       {selectedFilters.length > 0 ? (
  //         selectedFilters.map((filter) => (
  //           <Box
  //             key={filter.id}
  //             sx={{
  //               display: "flex",
  //               alignItems: "center",
  //               justifyContent: "space-between",
  //               padding: 1,
  //               backgroundColor:
  //                 highlightedFilter.id === filter.id ? "yellow" : "transparent",
  //               borderBottom: "1px solid #ddd",
  //             }}
  //           >
  //             <Box sx={{ display: "flex", alignItems: "center" }}>
  //               {/* Enable/Disable Checkbox */}
  //               <input
  //                 type="checkbox"
  //                 checked={filter.isEnabled || false}
  //                 onChange={() => handleCheckboxChange(filter)}
  //               />
  //               {/* Filter Name (Clickable for Highlighting) */}
  //               <Typography
  //                 variant="body1"
  //                 sx={{
  //                   ml: 1,
  //                   cursor: "pointer",
  //                   fontWeight:
  //                     highlightedFilter.id === filter.id ? "bold" : "normal",
  //                 }}
  //                 onClick={() => handleFilterHighlight(filter)}
  //               >
  //                 {filter.name}
  //               </Typography>
  //             </Box>
  //             {/* Edit Params Button */}
  //             <Button
  //               variant="outlined"
  //               size="small"
  //               onClick={() => filter.editParams()}
  //               sx={{ ml: 2 }}
  //             >
  //               Edit
  //             </Button>
  //           </Box>
  //         ))
  //       ) : (
  //         <Typography variant="body2">No filters selected.</Typography>
  //       )}
  //     </Box>

  //     {/* Reset Filters Button */}
  //     <Box sx={{ mt: 2 }}>
  //       <Button
  //         variant="contained"
  //         color="secondary"
  //         onClick={() => {
  //           setEnabledFilters([]);
  //           setSelectedFilters([]);
  //         }}
  //       >
  //         Reset Filters
  //       </Button>
  //     </Box>

  //     {/* Well Selection Modal */}
  //     <WellSelectionModal onFilterApply={filterSelectedWells} />

  //     {/* Modal for Filter Selection */}
  //     <Modal open={open} onClose={handleClose}>
  //       <Box sx={modalStyle}>
  //         <Typography id="modal-modal-title" variant="h6" component="h2">
  //           Select Filters
  //         </Typography>
  //         <Box sx={{ marginTop: 2, display: "flex", flexDirection: "column" }}>
  //           {/* Radio Buttons for Filter Selection */}
  //           {[
  //             {
  //               id: "static-ratio",
  //               label: "Static Ratio",
  //               value: "staticRatio",
  //             },
  //             {
  //               id: "dynamic-ratio",
  //               label: "Dynamic Ratio",
  //               value: "dynamicRatio",
  //             },
  //             { id: "div-filter", label: "Divide by 2", value: "divFilter" },
  //             {
  //               id: "smoothing-filter",
  //               label: "Smoothing",
  //               value: "smoothingFilter",
  //             },
  //           ].map(({ id, label, value }) => (
  //             <Box key={id} sx={{ mb: 1 }}>
  //               <input
  //                 type="radio"
  //                 id={id}
  //                 value={value}
  //                 name="filter-radio"
  //                 checked={selectedValue === value}
  //                 onChange={handleRadioCheck}
  //               />
  //               <label htmlFor={id}>{label}</label>
  //             </Box>
  //           ))}
  //         </Box>
  //         <Button
  //           onClick={handleConfirm}
  //           variant="contained"
  //           sx={{ marginTop: 2, alignSelf: "flex-end" }}
  //         >
  //           Confirm Filter Selection
  //         </Button>
  //       </Box>
  //     </Modal>

  //     {/* Parameter Modals for Editing Filters */}
  //     {editModalType === "staticRatio" && (
  //       <StaticRatioModal
  //         open={openDialog}
  //         onClose={() => setOpenDialog(false)}
  //         startValue={startValue}
  //         setStartValue={setStartValue}
  //         endValue={endValue}
  //         setEndValue={setEndValue}
  //         onSave={handleSaveParams}
  //       />
  //     )}

  //     {editModalType === "smoothingFilter" && (
  //       <SmoothingFilterModal
  //         open={openDialog}
  //         onClose={() => setOpenDialog(false)}
  //         windowWidth={windowWidth}
  //         setWindowWidth={setWindowWidth}
  //         onSave={handleSaveParams}
  //       />
  //     )}
  //   </Box>

  // );
  return (
    <Box
      className="filter-controls"
      sx={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      {/* Apply Filters Button */}
      <Button
        className="filter-controls__apply-button"
        variant="contained"
        color="primary"
        onClick={applyEnabledFilters}
        sx={{ mb: 2 }}
      >
        Apply Filters
      </Button>

      <div
        className="filter-controls__selection-controls"
        style={{ width: "100%" }}
      >
        {/* Modal Trigger for Adding Filters */}
        <Button
          className="filter-controls__add-filter-button"
          onClick={handleOpen}
          variant="outlined"
          color="primary"
        >
          + Add Filter
        </Button>

        {/* Order Up Button */}
        <Button
          className="filter-controls__order-up-button"
          onClick={handleChangeFilterOrderUp}
          variant="outlined"
          sx={{ ml: 1 }}
        >
          ↑
        </Button>

        {/* Remove Filter Button */}
        <Button
          className="filter-controls__remove-filter-button"
          onClick={handleRemoveHighlightedFilter}
          variant="outlined"
          color="error"
          sx={{ ml: 1 }}
        >
          x Remove Filter
        </Button>

        {/* Order Down Button */}
        <Button
          className="filter-controls__order-down-button"
          onClick={handleChangeFilterOrderDown}
          variant="outlined"
          sx={{ ml: 1 }}
        >
          ↓
        </Button>
      </div>

      {/* Selected Filters List */}
      <Box
        className="filter-controls__selected-filters"
        sx={{
          width: "100%",
          mt: 3,
          border: "1px solid #ccc",
          borderRadius: 2,
          padding: 2,
        }}
      >
        <Typography
          className="filter-controls__selected-filters-title"
          variant="h6"
        >
          Selected Filters
        </Typography>
        {selectedFilters.length > 0 ? (
          selectedFilters.map((filter) => (
            <Box
              key={filter.id}
              className={`filter-controls__filter-item ${
                highlightedFilter.id === filter.id
                  ? "filter-controls__filter-item--highlighted"
                  : ""
              }`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 1,
                borderBottom: "1px solid #ddd",
              }}
            >
              <Box
                className="filter-controls__filter-item-info"
                sx={{ display: "flex", alignItems: "center" }}
              >
                {/* Enable/Disable Checkbox */}
                <input
                  className="filter-controls__checkbox"
                  type="checkbox"
                  checked={filter.isEnabled || false}
                  onChange={() => handleCheckboxChange(filter)}
                />
                {/* Filter Name (Clickable for Highlighting) */}
                <Typography
                  className="filter-controls__filter-name"
                  variant="body1"
                  sx={{
                    ml: 1,
                    cursor: "pointer",
                    fontWeight:
                      highlightedFilter.id === filter.id ? "bold" : "normal",
                    backgroundColor:
                      highlightedFilter.id === filter.id
                        ? "yellow"
                        : "transparent",
                  }}
                  onClick={() => handleFilterHighlight(filter)}
                >
                  {filter.name}
                </Typography>
              </Box>
              {/* Edit Params Button */}
              <Button
                className="filter-controls__edit-button"
                variant="outlined"
                size="small"
                onClick={() => filter.editParams()}
                sx={{ ml: 2 }}
              >
                Edit
              </Button>
            </Box>
          ))
        ) : (
          <Typography className="filter-controls__no-filters" variant="body2">
            No filters selected.
          </Typography>
        )}
      </Box>

      {/* Reset Filters Button */}
      <Box className="filter-controls__reset-button-wrapper" sx={{ mt: 2 }}>
        <Button
          className="filter-controls__reset-button"
          variant="contained"
          color="secondary"
          onClick={() => {
            setEnabledFilters([]);
            setSelectedFilters([]);
          }}
        >
          Reset Filters
        </Button>
      </Box>

      {/* Well Selection Modal */}
      <WellSelectionModal
        className="filter-controls__well-selection-modal"
        onFilterApply={filterSelectedWells}
      />

      {/* Modal for Filter Selection */}
      <Modal
        className="filter-controls__filter-selection-modal"
        open={open}
        onClose={handleClose}
      >
        <Box
          className="filter-controls__filter-selection-modal-content"
          sx={modalStyle}
        >
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Select Filters
          </Typography>
          <Box sx={{ marginTop: 2, display: "flex", flexDirection: "column" }}>
            {/* Radio Buttons for Filter Selection */}
            {[
              {
                id: "static-ratio",
                label: "Static Ratio",
                value: "staticRatio",
              },
              {
                id: "dynamic-ratio",
                label: "Dynamic Ratio",
                value: "dynamicRatio",
              },
              { id: "div-filter", label: "Divide by 2", value: "divFilter" },
              {
                id: "smoothing-filter",
                label: "Smoothing",
                value: "smoothingFilter",
              },
            ].map(({ id, label, value }) => (
              <Box
                key={id}
                className="filter-controls__filter-radio"
                sx={{ mb: 1 }}
              >
                <input
                  className="filter-controls__radio-input"
                  type="radio"
                  id={id}
                  value={value}
                  name="filter-radio"
                  checked={selectedValue === value}
                  onChange={handleRadioCheck}
                />
                <label className="filter-controls__radio-label" htmlFor={id}>
                  {label}
                </label>
              </Box>
            ))}
          </Box>
          <Button
            className="filter-controls__confirm-selection-button"
            onClick={handleConfirm}
            variant="contained"
            sx={{ marginTop: 2, alignSelf: "flex-end" }}
          >
            Confirm Filter Selection
          </Button>
        </Box>
      </Modal>

      {/* Parameter Modals for Editing Filters */}
      {editModalType === "staticRatio" && (
        <StaticRatioModal
          className="filter-controls__static-ratio-modal"
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          startValue={startValue}
          setStartValue={setStartValue}
          endValue={endValue}
          setEndValue={setEndValue}
          onSave={handleSaveParams}
        />
      )}

      {editModalType === "smoothingFilter" && (
        <SmoothingFilterModal
          className="filter-controls__smoothing-filter-modal"
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          windowWidth={windowWidth}
          setWindowWidth={setWindowWidth}
          onSave={handleSaveParams}
        />
      )}
    </Box>
  );
};

export default FilterControls;

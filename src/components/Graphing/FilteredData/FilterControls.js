import "../../../styles/FilterControls.css";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Drawer from "@mui/material//Drawer";
import Button from "@mui/material/Button";

import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import EditIcon from "@mui/icons-material/Edit";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AddCircleTwoToneIcon from "@mui/icons-material/AddCircleTwoTone";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { ListItem, Checkbox, Radio, FormControlLabel } from "@mui/material";
import {
  ArrowForwardIos as ArrowIcon,
  ArrowBackIos as ArrowBackIcon,
  RemoveCircleTwoTone,
} from "@mui/icons-material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useState, useEffect, useContext } from "react";
import { SmoothingFilterModal } from "./ParameterModals/SmoothingModal";
import { StaticRatioModal } from "./ParameterModals/StaticRatioModal";
import { ControlSubtractionModal } from "./ParameterModals/ControlSubtractionModal";
import { OutlierRemovalFilterModal } from "./ParameterModals/OutlierRemovalModal";
import { FlatFieldCorrectionModal } from "./ParameterModals/FlatFieldCorrectionModal";
import {
  StaticRatio_Filter,
  DynamicRatio_Filter,
  Div_Filter,
  Smoothing_Filter,
  ControlSubtraction_Filter,
  Derivative_Filter,
  OutlierRemoval_Filter,
  FlatFieldCorrection_Filter,
} from "./FilterModels";
import { DataContext } from "../../../providers/DataProvider";

export const FilterControls = ({
  applyEnabledFilters,
  columnLabels,
  rowLabels,
  annotations,
  setAnnotations,
  setAnnotationRangeStart,
  setAnnotationRangeEnd,
  largeCanvasWidth,
  largeCanvasHeight,
  smallCanvasWidth,
  smallCanvasHeight,
}) => {
  const {
    wellArrays,
    selectedFilters,
    setSelectedFilters,
    savedMetrics,
    setSavedMetrics,
    enabledFilters,
    uploadedFilters,
    setUploadedFilters,
    setEnabledFilters,
  } = useContext(DataContext);
  const [selectedWells, setSelectedWells] = useState([]);
  const [highlightedFilter, setHighlightedFilter] = useState({});
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState("staticRatio");

  // state for editParams dialogue
  const [openDialog, setOpenDialog] = useState(false);
  const [currentFilter, setCurrentFilter] = useState(null);
  const [editModalType, setEditModalType] = useState(null);
  // state for static ratio filter params
  const [startValue, setStartValue] = useState(0);
  const [endValue, setEndValue] = useState(5);
  // state for smoothing filter params
  const [windowWidth, setWindowWidth] = useState(0);
  // state for control subtraction filter params
  const [controlWellArray, setControlWellArray] = useState([]);
  const [applyWellArray, setApplyWellArray] = useState([]);
  // state for outlier removal filter params
  const [halfWindow, setHalfWindow] = useState(2);
  const [threshold, setThreshold] = useState(3);
  // state for flat field correction filter params
  const [correctionMatrix, setCorrectionMatrix] = useState([]);

  // state for drawer - collapsing controls
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleResetAnnotations = () => {
    // Reset the annotationRangeStart and annotationRangeEnd
    setAnnotationRangeStart(null);
    setAnnotationRangeEnd(null);
    setAnnotations([]);
  };

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

  const handleEditStaticRatioParams = (start, end, setParams) => {
    setStartValue(start);
    setEndValue(end);
    setCurrentFilter({ setParams });
    setEditModalType("staticRatio");
    setOpenDialog(true);
  };

  const handleEditSmoothingFilterParams = (windowWidth, setParams) => {
    setWindowWidth(windowWidth);
    setCurrentFilter({ setParams });
    setEditModalType("smoothingFilter");
    setOpenDialog(true);

    // console.log(currentFilter);
  };

  const handleEditControlSubtractionFilterParams = (
    controlWellArray,
    applyWellArray,
    setParams
  ) => {
    setControlWellArray(controlWellArray);
    setApplyWellArray(applyWellArray);
    setCurrentFilter({ setParams });
    setEditModalType("controlSubtractionFilter");
    setOpenDialog(true);
  };

  const handleEditOutlierRemovalFilterParams = (
    halfWindow,
    threshold,
    setParams
  ) => {
    setHalfWindow(halfWindow);
    setThreshold(threshold);
    setCurrentFilter({ setParams });
    setEditModalType("outlierRemovalFilter");
    setOpenDialog(true);
  };

  const handleEditFlatFieldCorrectionFilterParams = (
    correctionMatrix,
    setParams
  ) => {
    setCorrectionMatrix(correctionMatrix);
    setCurrentFilter({ setParams });
    setEditModalType("flatFieldCorrectionFilter");
    setOpenDialog(true);
  };

  const handleSaveParams = () => {
    // Save logic depending on the filter type
    if (editModalType === "staticRatio") {
      currentFilter.setParams(startValue, endValue);
    } else if (editModalType === "smoothingFilter") {
      currentFilter.setParams(windowWidth);
    } else if (editModalType === "controlSubtractionFilter") {
      currentFilter.setParams(controlWellArray, applyWellArray);
    } else if (editModalType === "outlierRemovalFilter") {
      currentFilter.setParams(halfWindow, threshold);
    } else if (editModalType === "flatFieldCorrectionFilter") {
      currentFilter.setParams(correctionMatrix);
    }

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
      // Update `selectedFilters` by toggling `isEnabled` for the highlighted filter
      const updatedSelectedFilters = selectedFilters.map((filter) => {
        if (filter.id === highlightedFilter.id) {
          filter.setEnabled(!filter.isEnabled);
        }
        return filter;
      });

      // Filter out the highlighted filter from both `enabledFilters` and `selectedFilters`
      const newSelectedFilters = updatedSelectedFilters.filter(
        (filter) => filter.id !== highlightedFilter.id
      );

      // Update `selectedFilters` with the remaining filters
      setSelectedFilters(newSelectedFilters);

      // Update `enabledFilters` only once after all filters have been processed
      setEnabledFilters((prevEnabledFilters) =>
        prevEnabledFilters.filter((f) => f.id !== highlightedFilter.id)
      );

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

    if (selectedValue === "staticRatio") {
      const newStaticRatioFilter = new StaticRatio_Filter(
        selectedFilters.length,
        handleEditStaticRatioParams
      );
      // append it to filter list
      console.log(newStaticRatioFilter);
      setSelectedFilters([...selectedFilters, newStaticRatioFilter]);
    } else if (selectedValue === "smoothingFilter") {
      const newSmoothingFilter = new Smoothing_Filter(
        selectedFilters.length,
        handleEditSmoothingFilterParams
      );

      console.log(newSmoothingFilter);
      setSelectedFilters([...selectedFilters, newSmoothingFilter]);
    } else if (selectedValue === "controlSubtraction") {
      const newControlSubtractionFilter = new ControlSubtraction_Filter(
        selectedFilters.length,
        handleEditControlSubtractionFilterParams,
        columnLabels.length,
        rowLabels.length
      );
      console.log(newControlSubtractionFilter);
      setSelectedFilters([...selectedFilters, newControlSubtractionFilter]);
    } else if (selectedValue === "derivative") {
      const newDerivativeFilter = new Derivative_Filter(selectedFilters.length);
      console.log(newDerivativeFilter);
      setSelectedFilters([...selectedFilters, newDerivativeFilter]);
    } else if (selectedValue === "outlierRemoval") {
      const newOutlierRemovalFilter = new OutlierRemoval_Filter(
        selectedFilters.length,
        handleEditOutlierRemovalFilterParams
      );
      console.log(newOutlierRemovalFilter);
      setSelectedFilters([...selectedFilters, newOutlierRemovalFilter]);
    } else if (selectedValue === "flatFieldCorrection") {
      const newFlatFieldCorrectionFilter = new FlatFieldCorrection_Filter(
        selectedFilters.length,
        handleEditFlatFieldCorrectionFilterParams
      );
      console.log(newFlatFieldCorrectionFilter);
      setSelectedFilters([...selectedFilters, newFlatFieldCorrectionFilter]);
    }

    // Apply the list of selected filters
  };

  // handle radio button check in filter selection modal
  const handleRadioCheck = (event) => {
    setSelectedValue(event.target.value);
  };

  useEffect(() => {
    // const handleLoadSavedFilters = (data) => {
    let newFilters = [];
    // data.filters.map((filter) => {
    uploadedFilters.map((filter) => {
      if (filter.name === "Static Ratio") {
        const newStaticRatioFilter = new StaticRatio_Filter(
          selectedFilters.length,
          handleEditStaticRatioParams
        );
        newStaticRatioFilter.setParams(filter.start, filter.end);
        newFilters.push(newStaticRatioFilter);
      } else if (filter.name === "Smoothing") {
        const newSmoothingFilter = new Smoothing_Filter(
          selectedFilters.length,
          handleEditSmoothingFilterParams
        );
        newSmoothingFilter.setParams(filter.windowWidth);
        newFilters.push(newSmoothingFilter);
      } else if (filter.name === "Control Subtraction") {
        const newControlSubtractionFilter = new ControlSubtraction_Filter(
          selectedFilters.length,
          handleEditControlSubtractionFilterParams,
          filter.number_of_columns,
          filter.number_of_rows
        );
        newControlSubtractionFilter.setParams(
          filter.controlWellArray,
          filter.applyWellArray
        );
        newFilters.push(newControlSubtractionFilter);
      } else if (filter.name === "Derivative") {
        const newDerivativeFilter = new Derivative_Filter(
          selectedFilters.length
        );
        newFilters.push(newDerivativeFilter);
      } else if (filter.name === "Outlier Removal") {
        const newOutlierRemovalFilter = new OutlierRemoval_Filter(
          selectedFilters.length,
          handleEditOutlierRemovalFilterParams
        );
        newOutlierRemovalFilter.setParams(filter.halfWindow, filter.threshold);
        newFilters.push(newOutlierRemovalFilter);
      } else if (filter.name === "Flat Field Correction") {
        const newFlatFieldCorrectionFilter = new FlatFieldCorrection_Filter(
          selectedFilters.length,
          handleEditFlatFieldCorrectionFilterParams
        );
        newFlatFieldCorrectionFilter.setParams(filter.correctionMatrix);
        newFilters.push(newFlatFieldCorrectionFilter);
      }
      return newFilters;
    });
    // setUploadedFilters(newFilters);
    setSelectedFilters(newFilters);
    // setSavedMetrics(data.metrics);
    // alert("Filters and metrics loaded successfully!");
    // };
  }, [uploadedFilters]);

  return (
    <Box className="filter-controls">
      {/* Apply Filters Button */}
      <Button
        className="filter-controls__apply-button"
        variant="contained"
        color="primary"
        onClick={applyEnabledFilters}
      >
        Apply Filters
      </Button>

      <Box
        className="filter-controls__selection-controls"
        sx={{
          display: "flex",
          flexDirection: "row",
          // gap: 1
        }}
      >
        {/* Modal Trigger for Adding Filters */}
        <IconButton
          className="filter-controls__add-filter-button"
          onClick={handleOpen}
          variant="outlined"
          color="primary"
          sx={{ padding: 0, margin: 0 }}
        >
          {/* <AddCircleIcon /> */}
          {/* <AddCircleOutlineIcon /> */}
          <AddCircleTwoToneIcon />
        </IconButton>

        {/* Order Up Button */}
        <IconButton
          className="filter-controls__order-up-button"
          onClick={handleChangeFilterOrderUp}
          variant="outlined"
          sx={{ padding: 0, margin: 0 }}
        >
          <ArrowUpwardIcon />
        </IconButton>
      </Box>

      <Box
        className="filter-controls__selection-controls"
        sx={{ display: "flex", flexDirection: "row" }}
      >
        {/* Remove Filter Button */}
        <IconButton
          className="filter-controls__remove-filter-button"
          onClick={handleRemoveHighlightedFilter}
          variant="outlined"
          color="error"
          sx={{ padding: 0, margin: 0 }}
        >
          {/* <RemoveCircleOutlineIcon /> */}
          <RemoveCircleTwoTone />
        </IconButton>

        {/* Order Down Button */}
        <IconButton
          className="filter-controls__order-down-button"
          onClick={handleChangeFilterOrderDown}
          variant="outlined"
          sx={{ padding: 0, margin: 0 }}
        >
          <ArrowDownwardIcon />
        </IconButton>
      </Box>

      {/* Selected Filters List */}
      <section className="filter-controls__selected-filters">
        <Typography
          className="filter-controls__selected-filters-header"
          variant="body1"
        >
          Filters:
        </Typography>

        {selectedFilters.length > 0 ? (
          selectedFilters.map((filter) => (
            <ListItem
              key={filter.id}
              className={`filter-controls__filter-item ${
                highlightedFilter.id === filter.id
                  ? "filter-controls__filter-item--highlighted"
                  : ""
              }`}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    className="filter-controls__checkbox"
                    checked={filter.isEnabled || false}
                    onChange={() => handleCheckboxChange(filter)}
                    color="primary"
                  />
                }
              />
              <Typography
                className="filter-controls__filter-name"
                variant="body1"
                sx={{
                  cursor: "pointer",
                  fontWeight:
                    highlightedFilter.id === filter.id ? "bold" : "normal",
                  fontSize: "0.75em",
                  backgroundColor:
                    highlightedFilter.id === filter.id
                      ? "yellow"
                      : "transparent",
                }}
                onClick={() => handleFilterHighlight(filter)}
              >
                {filter.name}
              </Typography>

              {/* Edit Params Button */}
              {filter.name !== "Derivative" && (
                <IconButton
                  className="filter-controls__edit-button"
                  variant="outlined"
                  size="small"
                  onClick={() => filter.editParams()}
                  sx={{ ml: 0, padding: 0, borderRadius: 100 }}
                >
                  <EditIcon sx={{ fontSize: 15 }} />
                </IconButton>
              )}
            </ListItem>
          ))
        ) : (
          <Typography className="filter-controls__no-filters" variant="body2">
            No filters selected.
          </Typography>
        )}
      </section>

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
                id: "smoothing-filter",
                label: "Smoothing",
                value: "smoothingFilter",
              },
              {
                id: "control-subtraction-filter",
                label: "Control Subtraction",
                value: "controlSubtraction",
              },
              {
                id: "derivative-filter",
                label: "Derivative",
                value: "derivative",
              },
              {
                id: "outlier-removal-filter",
                label: "Outlier Removal",
                value: "outlierRemoval",
              },
              {
                id: "flat-field-correction-filter",
                label: "Flat Field Correction",
                value: "flatFieldCorrection",
              },
            ].map(({ id, label, value }) => (
              <Box
                key={id}
                className="filter-controls__filter-radio"
                sx={{ mb: 1 }}
              >
                <Radio
                  className="filter-controls__radio-input"
                  id={id}
                  value={value}
                  name="filter-radio"
                  checked={selectedValue === value}
                  onChange={handleRadioCheck}
                />
                <Typography
                  className="filter-controls__radio-label"
                  variant="body2"
                  component="label"
                  htmlFor={id}
                >
                  {label}
                </Typography>
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
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          windowWidth={windowWidth}
          setWindowWidth={setWindowWidth}
          onSave={handleSaveParams}
        />
      )}

      {editModalType === "controlSubtractionFilter" && (
        <ControlSubtractionModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          controlWellArray={controlWellArray}
          setControlWellArray={setControlWellArray}
          applyWellArray={applyWellArray}
          setApplyWellArray={setApplyWellArray}
          number_of_rows={rowLabels.length}
          number_of_columns={columnLabels.length}
          onSave={handleSaveParams}
          largeCanvasWidth={largeCanvasWidth}
          largeCanvasHeight={largeCanvasHeight}
          smallCanvasWidth={smallCanvasWidth}
          smallCanvasHeight={smallCanvasHeight}
        />
      )}

      {editModalType === "outlierRemovalFilter" && (
        <OutlierRemovalFilterModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          halfWindow={halfWindow}
          setHalfWindow={setHalfWindow}
          threshold={threshold}
          setThreshold={setThreshold}
          onSave={handleSaveParams}
        />
      )}

      {editModalType === "flatFieldCorrectionFilter" && (
        <FlatFieldCorrectionModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          correctionMatrix={correctionMatrix}
          setCorrectionMatrix={setCorrectionMatrix}
          onSave={handleSaveParams}
        />
      )}
    </Box>
  );
};

export default FilterControls;

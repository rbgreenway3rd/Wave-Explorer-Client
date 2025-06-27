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
import RefreshTwoToneIcon from "@mui/icons-material/RefreshTwoTone";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Tooltip from "@mui/material/Tooltip";
import HelpTwoToneIcon from "@mui/icons-material/HelpTwoTone";
import DoneOutlineTwoToneIcon from "@mui/icons-material/DoneOutlineTwoTone";
import TuneTwoToneIcon from "@mui/icons-material/TuneTwoTone";
import FileUploadTwoToneIcon from "@mui/icons-material/FileUploadTwoTone";

import { ListItem, Checkbox, Radio, FormControlLabel } from "@mui/material";
import {
  ArrowForwardIos as ArrowIcon,
  ArrowBackIos as ArrowBackIcon,
  RemoveCircleTwoTone,
  EqualizerTwoTone,
  InsightsTwoTone,
} from "@mui/icons-material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { React, useState, useEffect, useContext } from "react";
import { SmoothingFilterModal } from "./ParameterModals/SmoothingModal";
import { StaticRatioModal } from "./ParameterModals/StaticRatioModal";
import { ControlSubtractionModal } from "./ParameterModals/ControlSubtractionModal";
import { OutlierRemovalFilterModal } from "./ParameterModals/OutlierRemovalModal";
import { FlatFieldCorrectionModal } from "./ParameterModals/FlatFieldCorrectionModal";
import { DynamicRatioModal } from "./ParameterModals/DynamicRatioModal";
import {
  StaticRatio_Filter,
  DynamicRatio_Filter,
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
  const [useMedian, setUseMedian] = useState(false); // New state
  // state for control subtraction filter params
  // const [controlWellArray, setControlWellArray] = useState([]);
  // const [applyWellArray, setApplyWellArray] = useState([]);
  // state for outlier removal filter params
  const [halfWindow, setHalfWindow] = useState(2);
  const [threshold, setThreshold] = useState(3);
  // state for flat field correction filter params
  const [correctionMatrix, setCorrectionMatrix] = useState([]);
  // state for dynamic ratio filter params
  const [numerator, setNumerator] = useState(0);
  const [denominator, setDenominator] = useState(1);

  // state for drawer - collapsing controls
  const [isCollapsed, setIsCollapsed] = useState(false);

  // State for controlling visibility of filter description within selection modal
  const [isDescVisible, setIsDescVisible] = useState(false);

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
    // width: "80%",
    // maxWidth: 800,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    p: 2,
  };

  // Update all handleEdit*Params to always set the filter instance as currentFilter
  const handleEditStaticRatioParams = (start, end, setParams, filter) => {
    setStartValue(start);
    setEndValue(end);
    setCurrentFilter(filter);
    setEditModalType("staticRatio");
    setOpenDialog(true);
  };

  const handleEditSmoothingFilterParams = (
    windowWidth,
    useMedian,
    setParams,
    filter
  ) => {
    setWindowWidth(windowWidth);
    setUseMedian(useMedian);
    setCurrentFilter(filter);
    setEditModalType("smoothingFilter");
    setOpenDialog(true);
  };

  const handleEditControlSubtractionFilterParams = (filter) => {
    setCurrentFilter(filter);
    setEditModalType("controlSubtractionFilter");
    setOpenDialog(true);
  };

  const handleEditOutlierRemovalFilterParams = (
    halfWindow,
    threshold,
    setParams,
    filter
  ) => {
    setHalfWindow(halfWindow);
    setThreshold(threshold);
    setCurrentFilter(filter);
    setEditModalType("outlierRemovalFilter");
    setOpenDialog(true);
  };

  const handleEditFlatFieldCorrectionFilterParams = (
    correctionMatrix,
    setParams,
    filter
  ) => {
    setCorrectionMatrix(correctionMatrix);
    setCurrentFilter(filter);
    setEditModalType("flatFieldCorrectionFilter");
    setOpenDialog(true);
  };

  const handleEditDynamicRatioFilterParams = (
    numerator,
    denominator,
    setParams,
    filter
  ) => {
    setNumerator(numerator);
    setDenominator(denominator);
    setCurrentFilter(filter);
    setEditModalType("dynamicRatioFilter");
    setOpenDialog(true);
  };

  const handleSaveParams = (param1, param2) => {
    // Save logic depending on the filter type
    if (editModalType === "staticRatio") {
      currentFilter.setParams(startValue, endValue);
    } else if (editModalType === "smoothingFilter") {
      currentFilter.setParams(windowWidth, useMedian);
    } else if (editModalType === "controlSubtractionFilter") {
      // param1: controlWellArray, param2: applyWellArray
      // Instead of mutating the instance, replace it immutably in selectedFilters
      // OLD ---
      // currentFilter.setParams(param1, param2);
      // ---
      // NEW ---
      setSelectedFilters((prevFilters) =>
        prevFilters.map((f) => {
          if (f.id === currentFilter.id) {
            // Create a new instance with updated arrays, preserving other properties
            const updated = Object.create(Object.getPrototypeOf(f));
            Object.assign(updated, f, {
              controlWellArray: [...param1],
              applyWellArray: [...param2],
            });
            return updated;
          }
          return f;
        })
      );
      // Also update the instance for enabledFilters if needed
      setEnabledFilters((prevFilters) =>
        prevFilters.map((f) => {
          if (f.id === currentFilter.id) {
            const updated = Object.create(Object.getPrototypeOf(f));
            Object.assign(updated, f, {
              controlWellArray: [...param1],
              applyWellArray: [...param2],
            });
            return updated;
          }
          return f;
        })
      );
      // ---
    } else if (editModalType === "outlierRemovalFilter") {
      currentFilter.setParams(halfWindow, threshold);
    } else if (editModalType === "flatFieldCorrectionFilter") {
      // param1 is the correctionMatrix from the modal
      setSelectedFilters((prevFilters) =>
        prevFilters.map((f) => {
          if (f.id === currentFilter.id) {
            const updated = Object.create(Object.getPrototypeOf(f));
            Object.assign(updated, f, {
              correctionMatrix: Array.isArray(param1) ? [...param1] : [],
            });
            return updated;
          }
          return f;
        })
      );
      setEnabledFilters((prevFilters) =>
        prevFilters.map((f) => {
          if (f.id === currentFilter.id) {
            const updated = Object.create(Object.getPrototypeOf(f));
            Object.assign(updated, f, {
              correctionMatrix: Array.isArray(param1) ? [...param1] : [],
            });
            return updated;
          }
          return f;
        })
      );
    } else if (editModalType === "dynamicRatioFilter") {
      currentFilter.setParams(numerator, denominator);
    }
    setOpenDialog(false);
  };

  useEffect(() => {
    console.log("Updated selectedFilters: ", selectedFilters);
  }, [selectedFilters]);

  const handleCheckboxChange = (filter) => {
    // Check if the filter is "Flat Field Correction" and if the correctionMatrix is empty
    if (
      filter.name === "Flat Field Correction" &&
      correctionMatrix.length === 0
    ) {
      alert(
        "Please upload a correction matrix before enabling the Flat Field Correction filter."
      );
      return; // Prevent enabling the filter
    }

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
      setEnabledFilters([...enabledFilters, newStaticRatioFilter]);
    } else if (selectedValue === "smoothingFilter") {
      const newSmoothingFilter = new Smoothing_Filter(
        selectedFilters.length,
        handleEditSmoothingFilterParams
      );

      console.log(newSmoothingFilter);
      setSelectedFilters([...selectedFilters, newSmoothingFilter]);
      setEnabledFilters([...enabledFilters, newSmoothingFilter]);
    } else if (selectedValue === "controlSubtraction") {
      const newControlSubtractionFilter = new ControlSubtraction_Filter(
        selectedFilters.length,
        handleEditControlSubtractionFilterParams,
        columnLabels.length,
        rowLabels.length
      );
      console.log(newControlSubtractionFilter);
      setSelectedFilters([...selectedFilters, newControlSubtractionFilter]);
      setEnabledFilters([...enabledFilters, newControlSubtractionFilter]);
    } else if (selectedValue === "derivative") {
      const newDerivativeFilter = new Derivative_Filter(selectedFilters.length);
      console.log(newDerivativeFilter);
      setSelectedFilters([...selectedFilters, newDerivativeFilter]);
      setEnabledFilters([...enabledFilters, newDerivativeFilter]);
    } else if (selectedValue === "outlierRemoval") {
      const newOutlierRemovalFilter = new OutlierRemoval_Filter(
        selectedFilters.length,
        handleEditOutlierRemovalFilterParams
      );
      console.log(newOutlierRemovalFilter);
      setSelectedFilters([...selectedFilters, newOutlierRemovalFilter]);
      setEnabledFilters([...enabledFilters, newOutlierRemovalFilter]);
    } else if (selectedValue === "flatFieldCorrection") {
      const newFlatFieldCorrectionFilter = new FlatFieldCorrection_Filter(
        selectedFilters.length,
        handleEditFlatFieldCorrectionFilterParams
      );
      console.log(newFlatFieldCorrectionFilter);
      setSelectedFilters([...selectedFilters, newFlatFieldCorrectionFilter]);
      setEnabledFilters([...enabledFilters, newFlatFieldCorrectionFilter]);
    } else if (selectedValue === "dynamicRatio") {
      const newDynamicRatioFilter = new DynamicRatio_Filter(
        selectedFilters.length,
        handleEditDynamicRatioFilterParams
      );
      console.log(newDynamicRatioFilter);
      setSelectedFilters([...selectedFilters, newDynamicRatioFilter]);
      setEnabledFilters([...enabledFilters, newDynamicRatioFilter]);
    }
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
      } else if (filter.name === "Dynamic Ratio") {
        const newDynamicRatioFilter = new DynamicRatio_Filter(
          selectedFilters.length,
          handleEditDynamicRatioFilterParams
        );
        newDynamicRatioFilter.setParams(filter.numerator, filter.denominator);
        newFilters.push(newDynamicRatioFilter);
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
    <div className="filter-controls">
      {/* Apply Filters Button */}
      <Tooltip
        title="Apply all enabled filters"
        arrow
        placement="top"
        disableInteractive
      >
        <Button
          className="filter-controls__apply-button"
          variant="contained"
          color="primary"
          onClick={applyEnabledFilters}
        >
          <RefreshTwoToneIcon />
          Apply Filters
        </Button>
      </Tooltip>

      <section className="filter-controls__selection-controls">
        <div className="selection-controls-group">
          {/* Modal Trigger for Adding Filters */}
          <Tooltip title="Add a filter" disableInteractive>
            <button className="selection-controls-button" onClick={handleOpen}>
              <AddCircleTwoToneIcon
                sx={{
                  color: "green",
                }}
              />
            </button>
          </Tooltip>

          <Tooltip title="Move filter up" disableInteractive>
            <button
              className="selection-controls-button"
              onClick={handleChangeFilterOrderUp}
            >
              <ArrowUpwardIcon />
            </button>
          </Tooltip>
        </div>

        {/* <Box
        className="filter-controls__selection-controls"
        sx={{ display: "flex", flexDirection: "row" }}
        > */}
        {/* Remove Filter Button */}
        <div className="selection-controls-group">
          <Tooltip title="Remove highlighted filter" disableInteractive>
            <button
              className="selection-controls-button"
              onClick={handleRemoveHighlightedFilter}
            >
              <RemoveCircleTwoTone
                sx={{
                  color: "red",
                }}
              />
            </button>
          </Tooltip>

          <Tooltip title="Move filter down" disableInteractive>
            <button
              className="selection-controls-button"
              onClick={handleChangeFilterOrderDown}
            >
              <ArrowDownwardIcon />
            </button>
          </Tooltip>
          {/* </Box> */}
        </div>
      </section>

      {/* Selected Filters List */}
      <section className="filter-controls__selected-filters">
        <Typography
          className="filter-controls__selected-filters-header"
          variant="body1"
          style={{
            borderBottom: "none",
            // borderTop: "0.1em solid rgb(48, 79.5, 143)",
            // backgroundImage:
            //   "linear-gradient( rgb(96, 127, 190, 0.25) 0%,rgb(48, 79.5, 143, 0.15) 50%, rgb(0,32,96, 0.05) 70%)",
            // boxShadow:
            // "0px 1px 2px  rgba(80, 80, 80, 0.25), 0px 1px 3px 3px rgb(100, 100, 100, 0.15), 0px 1px 4px 4px rgba(100, 100, 100, 0.07)",
          }}
        >
          {/* <TuneTwoToneIcon /> */}
          {/* <EqualizerTwoTone /> */}
          <InsightsTwoTone />
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
              sx={{
                background:
                  highlightedFilter.id === filter.id
                    ? "radial-gradient( rgba(255,255,0,1) 10%, rgba(0,0,0,0) 100%)"
                    : "transparent",
              }}
            >
              <FormControlLabel
                sx={{
                  background:
                    highlightedFilter.id === filter.id
                      ? "radial-gradient( rgba(255,255,0,1) 10%, rgba(0,0,0,0) 100%)"
                      : "transparent",
                }}
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
                  textAlign: "center",
                  cursor: "pointer",
                  fontWeight:
                    highlightedFilter.id === filter.id ? "bold" : "normal",
                  fontSize: "0.6em",
                  borderRadius: "8px",
                  padding: "0.25em",
                }}
                onClick={() => handleFilterHighlight(filter)}
              >
                {filter.name}
              </Typography>

              {/* Edit Params Button */}
              <IconButton
                className="filter-controls__edit-button"
                variant="outlined"
                size="small"
                onClick={() => filter.editParams()}
                sx={{
                  ml: 0,
                  padding: 0,
                  borderRadius: 100,
                  ...(filter.name === "Flat Field Correction" &&
                  correctionMatrix.length === 0
                    ? {
                        animation: "glow 1s infinite alternate",
                        "@keyframes glow": {
                          from: {
                            boxShadow: "0 0 5px #ff0000",
                          },
                          to: {
                            boxShadow: "0 0 20px #ff0000",
                          },
                        },
                      }
                    : {}),
                }}
                disabled={filter.name === "Derivative"}
              >
                {filter.name === "Flat Field Correction" ? (
                  <FileUploadTwoToneIcon
                    sx={{ fontSize: 13, padding: 0, margin: 0 }}
                  />
                ) : (
                  <EditIcon sx={{ fontSize: 13, padding: 0, margin: 0 }} />
                )}
              </IconButton>
            </ListItem>
          ))
        ) : (
          <Typography
            style={{
              display: "flex",
              padding: 0,
              color: "#888",
              textAlign: "center",
              fontSize: "0.7em",
              justifySelf: "center",
              alignSelf: "center",
            }}
          >
            No filters selected.
          </Typography>
        )}
      </section>

      {/* Modal for Filter Selection */}
      <Modal
        className="filter-controls__filter-selection-modal"
        open={open}
        onClose={handleClose}
        sx={{ display: "flex", justifyContent: "center" }}
      >
        <Box
          className="filter-controls__filter-selection-modal-content"
          sx={modalStyle}
        >
          <Typography id="modal-modal-title">Select Filter</Typography>
          <Box
            sx={{
              marginTop: 2,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {[
              {
                id: "static-ratio",
                label: "Static Ratio",
                value: "staticRatio",
                desc: StaticRatio_Filter.desc,
              },
              {
                id: "smoothing-filter",
                label: "Smoothing",
                value: "smoothingFilter",
                desc: Smoothing_Filter.desc,
              },
              {
                id: "control-subtraction-filter",
                label: "Control Subtraction",
                value: "controlSubtraction",
                desc: ControlSubtraction_Filter.desc,
              },
              {
                id: "derivative-filter",
                label: "Derivative",
                value: "derivative",
                desc: Derivative_Filter.desc,
              },
              {
                id: "outlier-removal-filter",
                label: "Outlier Removal",
                value: "outlierRemoval",
                desc: OutlierRemoval_Filter.desc,
              },
              {
                id: "flat-field-correction-filter",
                label: "Flat Field Correction",
                value: "flatFieldCorrection",
                desc: FlatFieldCorrection_Filter.desc,
              },
              {
                id: "dynamic-ratio-filter",
                label: "Dynamic Ratio",
                value: "dynamicRatio",
                desc: DynamicRatio_Filter.desc,
              },
            ].map(({ id, label, value, desc }) => (
              <Box
                key={id}
                className="filter-controls__filter-radio"
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderBottom: "0.1em solid grey",
                  marginBottom: "0.5em",
                  alignItems: "center",
                }}
              >
                {/* Radio and Label */}
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Radio
                    className="filter-controls__radio-input"
                    id={id}
                    value={value}
                    name="filter-radio"
                    checked={selectedValue === value}
                    onChange={handleRadioCheck}
                    sx={{ pr: 1 }}
                  />
                  <Typography
                    className="filter-controls__radio-label"
                    variant="body2"
                    component="label"
                    htmlFor={id}
                    sx={{ fontWeight: "bold", marginRight: 1 }}
                  >
                    {label}
                  </Typography>
                </Box>

                {/* Help Icon and Description Box */}
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <HelpTwoToneIcon
                    sx={{ cursor: "pointer", color: "gray", marginRight: 1 }}
                    onClick={() =>
                      setIsDescVisible((current) =>
                        current === id ? null : id
                      )
                    } // Toggle visibility
                  />
                  {isDescVisible === id && (
                    <Box
                      sx={{
                        position: "absolute",
                        backgroundColor: "lightgrey",
                        border: "1px solid grey",
                        borderRadius: "4px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                        padding: "0.5em",
                        zIndex: 1000,
                        width: "100%",
                        // maxWidth: "300px",
                        marginLeft: "2em",
                        // marginTop: "-2.5em",
                      }}
                    >
                      <Typography variant="body2">{desc}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
          <Button
            className="filter-controls__confirm-selection-button"
            onClick={handleConfirm}
            variant="contained"
            sx={{
              marginTop: 2,
              display: "flex",
              marginLeft: "auto",
              marginRight: "auto",
              paddingLeft: "0.5em",
              paddingRight: "0.5em",
              width: "60%",
              justifyContent: "center",
              alignContent: "center",
            }}
          >
            <DoneOutlineTwoToneIcon
            // sx={{ mr: "0.25em" }}
            />
            Confirm Selection
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
        // <SmoothingFilterModal
        //   open={openDialog}
        //   onClose={() => setOpenDialog(false)}
        //   windowWidth={windowWidth}
        //   setWindowWidth={setWindowWidth}
        //   onSave={handleSaveParams}
        // />
        <SmoothingFilterModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          windowWidth={windowWidth}
          setWindowWidth={setWindowWidth}
          useMedian={useMedian} // Pass the state
          setUseMedian={setUseMedian} // Pass the setter
          onSave={handleSaveParams}
        />
      )}

      {editModalType === "controlSubtractionFilter" && (
        <ControlSubtractionModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          initialControlWellArray={currentFilter?.controlWellArray || []}
          initialApplyWellArray={currentFilter?.applyWellArray || []}
          number_of_rows={rowLabels.length}
          number_of_columns={columnLabels.length}
          onSave={(controlArray, applyArray) =>
            handleSaveParams(controlArray, applyArray)
          }
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
      {editModalType === "dynamicRatioFilter" && (
        <DynamicRatioModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          numerator={numerator}
          setNumerator={setNumerator}
          denominator={denominator}
          setDenominator={setDenominator}
          onSave={handleSaveParams}
        />
      )}
    </div>
  );
};

export default FilterControls;

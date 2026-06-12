import "../../../styles/FilterControls.css";
import EditIcon from "@mui/icons-material/Edit";
import AddCircleTwoToneIcon from "@mui/icons-material/AddCircleTwoTone";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RefreshTwoToneIcon from "@mui/icons-material/RefreshTwoTone";
import FileUploadTwoToneIcon from "@mui/icons-material/FileUploadTwoTone";
import Tooltip from "@mui/material/Tooltip";
import HelpTwoToneIcon from "@mui/icons-material/HelpTwoTone";
import DoneOutlineTwoToneIcon from "@mui/icons-material/DoneOutlineTwoTone";
import InsightsIcon from "@mui/icons-material/Insights";
import {
  RemoveCircleTwoTone,
  InsightsTwoTone,
} from "@mui/icons-material";
import { ListItem, Checkbox, Radio } from "@mui/material";
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
import {
  Button,
  IconButton,
  Heading,
  Text,
  Toolbar,
  FormRow,
  ToggleGroup,
  Modal,
} from "../../ui";

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
  handleResetFilteredData,
  yScaleMode,
  setYScaleMode,
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
  const [rescaleByMedianFo, setRescaleByMedianFo] = useState(false);
  // state for smoothing filter params
  const [windowWidth, setWindowWidth] = useState(0);
  const [useMedian, setUseMedian] = useState(false);
  // state for outlier removal filter params
  const [halfWindow, setHalfWindow] = useState(2);
  const [threshold, setThreshold] = useState(3);
  // state for flat field correction filter params
  const [correctionMatrix, setCorrectionMatrix] = useState([]);
  // state for dynamic ratio filter params
  const [numerator, setNumerator] = useState(0);
  const [denominator, setDenominator] = useState(1);

  // State for controlling visibility of filter description within selection modal
  const [isDescVisible, setIsDescVisible] = useState(false);

  // Update all handleEdit*Params to always set the filter instance as currentFilter
  const handleEditStaticRatioParams = (start, end, setParams, filter) => {
    setStartValue(start);
    setEndValue(end);
    setRescaleByMedianFo(!!filter?.rescaleByMedianFo);
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
    if (editModalType === "staticRatio") {
      currentFilter.setParams(startValue, endValue, rescaleByMedianFo);
    } else if (editModalType === "smoothingFilter") {
      currentFilter.setParams(windowWidth, useMedian);
    } else if (editModalType === "controlSubtractionFilter") {
      setSelectedFilters((prevFilters) =>
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
    } else if (editModalType === "outlierRemovalFilter") {
      currentFilter.setParams(halfWindow, threshold);
    } else if (editModalType === "flatFieldCorrectionFilter") {
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
    if (
      filter.name === "Flat Field Correction" &&
      correctionMatrix.length === 0
    ) {
      alert(
        "Please upload a correction matrix before enabling the Flat Field Correction filter."
      );
      return;
    }

    filter.setEnabled(!filter.isEnabled);

    const updatedSelectedFilters = selectedFilters.map((f) =>
      f.id === filter.id ? filter : f
    );
    setSelectedFilters(updatedSelectedFilters);

    if (filter.isEnabled) {
      setEnabledFilters((prev) => [...prev, filter]);
    } else {
      setEnabledFilters((prev) => prev.filter((f) => f.id !== filter.id));
    }
  };

  const handleFilterHighlight = (filter) => {
    if (highlightedFilter === filter) {
      setHighlightedFilter({});
    } else {
      setHighlightedFilter(filter);
    }
  };

  const handleRemoveHighlightedFilter = () => {
    if (highlightedFilter && highlightedFilter.id) {
      const updatedSelectedFilters = selectedFilters.map((filter) => {
        if (filter.id === highlightedFilter.id) {
          filter.setEnabled(!filter.isEnabled);
        }
        return filter;
      });

      const newSelectedFilters = updatedSelectedFilters.filter(
        (filter) => filter.id !== highlightedFilter.id
      );
      setSelectedFilters(newSelectedFilters);

      setEnabledFilters((prev) =>
        prev.filter((f) => f.id !== highlightedFilter.id)
      );

      setHighlightedFilter({});
    }
  };

  const handleChangeFilterOrderUp = () => {
    const index = selectedFilters.findIndex(
      (filter) => filter.id === highlightedFilter.id
    );
    if (index > 0) {
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
      const updatedFilters = [...selectedFilters];
      const temp = updatedFilters[index + 1];
      updatedFilters[index + 1] = updatedFilters[index];
      updatedFilters[index] = temp;
      setSelectedFilters(updatedFilters);
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleConfirm = () => {
    setOpen(false);

    if (selectedValue === "staticRatio") {
      const f = new StaticRatio_Filter(
        selectedFilters.length,
        handleEditStaticRatioParams
      );
      setSelectedFilters([...selectedFilters, f]);
      setEnabledFilters([...enabledFilters, f]);
    } else if (selectedValue === "smoothingFilter") {
      const f = new Smoothing_Filter(
        selectedFilters.length,
        handleEditSmoothingFilterParams
      );
      setSelectedFilters([...selectedFilters, f]);
      setEnabledFilters([...enabledFilters, f]);
    } else if (selectedValue === "controlSubtraction") {
      const f = new ControlSubtraction_Filter(
        selectedFilters.length,
        handleEditControlSubtractionFilterParams,
        columnLabels.length,
        rowLabels.length
      );
      setSelectedFilters([...selectedFilters, f]);
      setEnabledFilters([...enabledFilters, f]);
    } else if (selectedValue === "derivative") {
      const f = new Derivative_Filter(selectedFilters.length);
      setSelectedFilters([...selectedFilters, f]);
      setEnabledFilters([...enabledFilters, f]);
    } else if (selectedValue === "outlierRemoval") {
      const f = new OutlierRemoval_Filter(
        selectedFilters.length,
        handleEditOutlierRemovalFilterParams
      );
      setSelectedFilters([...selectedFilters, f]);
      setEnabledFilters([...enabledFilters, f]);
    } else if (selectedValue === "flatFieldCorrection") {
      const f = new FlatFieldCorrection_Filter(
        selectedFilters.length,
        handleEditFlatFieldCorrectionFilterParams
      );
      setSelectedFilters([...selectedFilters, f]);
      setEnabledFilters([...enabledFilters, f]);
    } else if (selectedValue === "dynamicRatio") {
      const f = new DynamicRatio_Filter(
        selectedFilters.length,
        handleEditDynamicRatioFilterParams
      );
      setSelectedFilters([...selectedFilters, f]);
      setEnabledFilters([...enabledFilters, f]);
    }
  };

  const handleRadioCheck = (event) => {
    setSelectedValue(event.target.value);
  };

  // REHYDRATE UPLOADED FILTERS
  useEffect(() => {
    let newFilters = [];

    uploadedFilters.map((filter) => {
      let newFilter;
      if (filter.name === "Static Ratio") {
        newFilter = new StaticRatio_Filter(
          selectedFilters.length,
          handleEditStaticRatioParams
        );
        newFilter.setParams(filter.start, filter.end, filter.rescaleByMedianFo);
      } else if (filter.name === "Smoothing") {
        newFilter = new Smoothing_Filter(
          selectedFilters.length,
          handleEditSmoothingFilterParams
        );
        newFilter.setParams(filter.windowWidth);
      } else if (filter.name === "Control Subtraction") {
        newFilter = new ControlSubtraction_Filter(
          selectedFilters.length,
          handleEditControlSubtractionFilterParams,
          filter.number_of_columns,
          filter.number_of_rows
        );
        newFilter.setParams(filter.controlWellArray, filter.applyWellArray);
      } else if (filter.name === "Derivative") {
        newFilter = new Derivative_Filter(selectedFilters.length);
      } else if (filter.name === "Outlier Removal") {
        newFilter = new OutlierRemoval_Filter(
          selectedFilters.length,
          handleEditOutlierRemovalFilterParams
        );
        newFilter.setParams(filter.halfWindow, filter.threshold);
      } else if (filter.name === "Flat Field Correction") {
        newFilter = new FlatFieldCorrection_Filter(
          selectedFilters.length,
          handleEditFlatFieldCorrectionFilterParams
        );
        newFilter.setParams(filter.correctionMatrix);
      } else if (filter.name === "Dynamic Ratio") {
        newFilter = new DynamicRatio_Filter(
          selectedFilters.length,
          handleEditDynamicRatioFilterParams
        );
        newFilter.setParams(filter.numerator, filter.denominator);
      }
      if (newFilter && filter.isEnabled) {
        newFilter.setEnabled(true);
      }
      if (newFilter) {
        newFilters.push(newFilter);
      }
      return newFilters;
    });

    setSelectedFilters(newFilters);
    setEnabledFilters(newFilters.filter((f) => f.isEnabled));
  }, [uploadedFilters]);

  const filterRadioOptions = [
    { id: "static-ratio", label: "Static Ratio", value: "staticRatio", desc: StaticRatio_Filter.desc },
    { id: "smoothing-filter", label: "Smoothing", value: "smoothingFilter", desc: Smoothing_Filter.desc },
    { id: "control-subtraction-filter", label: "Control Subtraction", value: "controlSubtraction", desc: ControlSubtraction_Filter.desc },
    { id: "derivative-filter", label: "Derivative", value: "derivative", desc: Derivative_Filter.desc },
    { id: "outlier-removal-filter", label: "Outlier Removal", value: "outlierRemoval", desc: OutlierRemoval_Filter.desc },
    { id: "flat-field-correction-filter", label: "Flat Field Correction", value: "flatFieldCorrection", desc: FlatFieldCorrection_Filter.desc },
    { id: "dynamic-ratio-filter", label: "Dynamic Ratio", value: "dynamicRatio", desc: DynamicRatio_Filter.desc },
  ];

  return (
    <div className="filter-controls quadrant-controls ui-surface ui-surface--panel">
      {/* Y Scale toggle — sits above Apply Filters in the same column. */}
      <Tooltip
        title="Y Scale: Universal (whole plate) or Relative (selected wells only)"
        arrow
        placement="top"
        disableInteractive
      >
        <div className="filter-controls__y-scale">
          <Text size="xs" tone="muted" align="center">Y Scale</Text>
          <ToggleGroup
            size="sm"
            value={yScaleMode}
            onChange={(_, v) => {
              if (v && setYScaleMode) setYScaleMode(v);
            }}
            options={[
              { value: "all", label: "Universal" },
              { value: "selected", label: "Relative" },
            ]}
            aria-label="filtered waves y-scale source"
          />
        </div>
      </Tooltip>

      {/* Apply Filters button */}
      <Tooltip title="Apply all enabled filters" arrow placement="top" disableInteractive>
        <span className="filter-controls__action-button">
          <Button
            variant="primary"
            block
            startIcon={<InsightsIcon />}
            onClick={applyEnabledFilters}
          >
            Apply Filters
          </Button>
        </span>
      </Tooltip>

      {/* Selection controls — add / remove / reorder */}
      <Toolbar align="between" className="filter-controls__selection-controls">
        <Toolbar align="start">
          <Tooltip title="Add a filter" disableInteractive>
            <IconButton variant="default" size="sm" onClick={handleOpen} aria-label="add filter">
              <AddCircleTwoToneIcon className="filter-controls__icon-add" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Move filter up" disableInteractive>
            <IconButton variant="default" size="sm" onClick={handleChangeFilterOrderUp} aria-label="move filter up">
              <ArrowUpwardIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        <Toolbar align="end">
          <Tooltip title="Remove highlighted filter" disableInteractive>
            <IconButton variant="default" size="sm" onClick={handleRemoveHighlightedFilter} aria-label="remove filter">
              <RemoveCircleTwoTone className="filter-controls__icon-remove" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Move filter down" disableInteractive>
            <IconButton variant="default" size="sm" onClick={handleChangeFilterOrderDown} aria-label="move filter down">
              <ArrowDownwardIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Toolbar>

      {/* Selected filters list */}
      <section className="filter-controls__selected-filters">
        <Heading level={4} className="filter-controls__selected-filters-header">
          <InsightsTwoTone />
          <span>Filters:</span>
        </Heading>

        {selectedFilters.length > 0 ? (
          selectedFilters.map((filter) => {
            const isHighlighted = highlightedFilter.id === filter.id;
            const ffcMissing =
              filter.name === "Flat Field Correction" &&
              correctionMatrix.length === 0;
            return (
              <ListItem
                key={filter.id}
                className={`filter-controls__filter-item ${
                  isHighlighted ? "filter-controls__filter-item--highlighted" : ""
                }`}
              >
                <Checkbox
                  className="filter-controls__checkbox"
                  checked={filter.isEnabled || false}
                  onChange={() => handleCheckboxChange(filter)}
                  color="primary"
                  size="small"
                />
                <button
                  type="button"
                  className={`filter-controls__filter-name ${
                    isHighlighted ? "filter-controls__filter-name--highlighted" : ""
                  }`}
                  onClick={() => handleFilterHighlight(filter)}
                >
                  {filter.name}
                </button>
                <IconButton
                  className={`filter-controls__edit-button ${
                    ffcMissing ? "filter-controls__edit-button--needs-upload" : ""
                  }`}
                  variant="subtle"
                  size="sm"
                  onClick={() => filter.editParams()}
                  disabled={filter.name === "Derivative"}
                  aria-label={`edit ${filter.name} parameters`}
                >
                  {filter.name === "Flat Field Correction" ? (
                    <FileUploadTwoToneIcon fontSize="inherit" />
                  ) : (
                    <EditIcon fontSize="inherit" />
                  )}
                </IconButton>
              </ListItem>
            );
          })
        ) : (
          <Text size="xs" tone="muted" align="center" className="filter-controls__empty">
            No filters selected.
          </Text>
        )}
      </section>

      {/* Undo Filters / reset to raw */}
      <Tooltip title="Resets Filtered Data to match Raw Data" arrow placement="top" disableInteractive>
        <span className="filter-controls__action-button filter-controls__action-button--bottom">
          <Button
            variant="primary"
            block
            startIcon={<RefreshTwoToneIcon />}
            onClick={handleResetFilteredData}
          >
            Undo Filters
          </Button>
        </span>
      </Tooltip>

      {/* Modal for Filter Selection */}
      <Modal
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        className="filter-controls__filter-selection-modal"
      >
        <Modal.Header>Select Filter</Modal.Header>
        <Modal.Body>
          <div className="filter-controls__filter-radio-list">
            {filterRadioOptions.map(({ id, label, value, desc }) => (
              <div key={id} className="filter-controls__filter-radio">
                <FormRow
                  label={label}
                  htmlFor={id}
                  className="filter-controls__filter-radio-row"
                >
                  <Radio
                    className="filter-controls__radio-input"
                    id={id}
                    value={value}
                    name="filter-radio"
                    checked={selectedValue === value}
                    onChange={handleRadioCheck}
                    size="small"
                  />
                </FormRow>
                <div className="filter-controls__filter-radio-help">
                  <IconButton
                    variant="subtle"
                    size="sm"
                    onClick={() =>
                      setIsDescVisible((current) => (current === id ? null : id))
                    }
                    aria-label={`toggle description for ${label}`}
                  >
                    <HelpTwoToneIcon />
                  </IconButton>
                  {isDescVisible === id && (
                    <div className="filter-controls__filter-desc">
                      <Text size="sm">{desc}</Text>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            startIcon={<DoneOutlineTwoToneIcon />}
            onClick={handleConfirm}
          >
            Confirm Selection
          </Button>
        </Modal.Footer>
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
          rescaleByMedianFo={rescaleByMedianFo}
          setRescaleByMedianFo={setRescaleByMedianFo}
          onSave={handleSaveParams}
        />
      )}

      {editModalType === "smoothingFilter" && (
        <SmoothingFilterModal
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          windowWidth={windowWidth}
          setWindowWidth={setWindowWidth}
          useMedian={useMedian}
          setUseMedian={setUseMedian}
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

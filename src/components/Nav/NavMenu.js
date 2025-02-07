import React, { useState, useContext } from "react";
import "../../styles/NavBar.css";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import FileDownloadTwoToneIcon from "@mui/icons-material/FileDownloadTwoTone";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import { DataContext } from "../../providers/DataProvider";
import { GenerateCSV } from "../FileHandling/GenerateReport";
import { Tooltip } from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CardiacAnalysisModal from "../CardiacAnalysis/CardiacAnalysisModal";

export const NavMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    project,
    selectedFilters,
    savedMetrics,
    setSelectedFilters,
    setSavedMetrics,
    setUploadedFilters,
  } = useContext(DataContext);

  const [includeRawData, setIncludeRawData] = useState(true);
  const [includeFilteredData, setIncludeFilteredData] = useState(true);
  const [includeSavedMetrics, setIncludeSavedMetrics] = useState(false);

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
  // state controlling Cardiac Analysis modal
  const [cardiacModalOpen, setCardiacModalOpen] = useState(false);

  const handleOpenCardiacModal = () => {
    setCardiacModalOpen(true);
    handleClose();
  };
  const handleCloseCardiacModal = () => {
    setCardiacModalOpen(false);
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

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSaveProjectReport = () => {
    setDialogOpen(true);
    handleClose();
  };

  const handleDownloadReport = () => {
    const csvContent = GenerateCSV(
      project,
      selectedFilters,
      includeRawData,
      includeFilteredData,
      includeSavedMetrics,
      savedMetrics
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "project_report.csv";
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDialogOpen(false);
    handleClose();
  };

  const handleSavePreferencesAsJSON = () => {
    const filtersAndMetrics = {
      filters: selectedFilters,
      metrics: savedMetrics,
    };

    const jsonContent = JSON.stringify(filtersAndMetrics, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "report_preferences.json";
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    handleClose();
  };

  const handleLoadPreferencesFromJSON = (event) => {
    const file = event.target.files[0];
    setSelectedFilters([]);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.filters && data.metrics) {
            let newFilters = data.filters;
            setUploadedFilters(newFilters);
            setSavedMetrics(data.metrics);
          } else {
            alert(
              "Invalid JSON format. Please upload a valid preferences file."
            );
          }
        } catch (error) {
          alert("Error reading the file. Make sure it's a valid JSON file.");
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <>
      <Tooltip title="Generate Reports and More" arrow>
        <IconButton
          onClick={handleClick}
          style={{
            border: "solid rgb(140, 140, 140) 1px",
            borderRadius: 0,
            backgroundImage:
              // "radial-gradient(rgb(240,240,240),rgb(220,220,220), rgb(200,200,200), rgb(180,180,180), rgb(160,160,160), rgb(140,140,140), rgb(120,120,120),rgb(100,100,100))",
              // "radial-gradient(rgb(240,240,240),rgb(220,220,220), rgb(200,200,210), rgb(180,180,190), rgb(160,160,170), rgb(140,140,150), rgb(120,120,130),rgb(100,100,110))",
              "radial-gradient(rgb(240,240,240),rgb(230,230,230), rgb(220,220,230), rgb(210,210,220), rgb(200,200,210), rgb(180,180,190), rgb(160,160,170),rgb(140,140,150))",
          }}
        >
          <MenuIcon style={{ fontSize: "0.9em" }} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleSaveProjectReport}>
          <FileDownloadTwoToneIcon />
          Generate Report
        </MenuItem>
        <MenuItem onClick={handleSavePreferencesAsJSON}>
          <SaveIcon />
          Save Filters and Metrics
        </MenuItem>
        <MenuItem>
          <label
            htmlFor="upload-json"
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          >
            <UploadFileIcon />
            Load Filters and Metrics
          </label>
          <input
            type="file"
            id="upload-json"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleLoadPreferencesFromJSON}
          />
        </MenuItem>
        <MenuItem
          className="cardiacAnalysisButton"
          onClick={handleOpenCardiacModal}
        >
          <FavoriteBorderIcon />
          Cardiac Analysis
        </MenuItem>
        {/* Other menu items */}
      </Menu>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Configure Report</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={includeRawData}
                onChange={(e) => setIncludeRawData(e.target.checked)}
              />
            }
            label="Include Raw Data"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeFilteredData}
                onChange={(e) => setIncludeFilteredData(e.target.checked)}
              />
            }
            label="Include Filtered Data"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeSavedMetrics}
                onChange={(e) => setIncludeSavedMetrics(e.target.checked)}
              />
            }
            label="Include Saved Metrics"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleDownloadReport} color="primary">
            Download Report
          </Button>
        </DialogActions>
      </Dialog>
      <CardiacAnalysisModal
        open={cardiacModalOpen}
        onClose={handleCloseCardiacModal}
      />
    </>
  );
};

export default NavMenu;

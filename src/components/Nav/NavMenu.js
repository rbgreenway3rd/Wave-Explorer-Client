import React, { useState, useContext } from "react";
import "../../styles/NavBar.css";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import FileDownloadTwoToneIcon from "@mui/icons-material/FileDownloadTwoTone";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { Tooltip } from "@mui/material";
import { Modal, Button } from "../ui";
import { DataContext } from "../../providers/DataProvider";
import { GenerateCSV } from "../FileHandling/GenerateReport";

export const NavMenu = ({ profile, onOpenCardiac }) => {
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
            setUploadedFilters(data.filters);
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
          className="nav-pill-button nav-pill-button--square"
          onClick={handleClick}
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
            className="navmenu__file-input-label"
          >
            <UploadFileIcon />
            Load Filters and Metrics
          </label>
          <input
            type="file"
            id="upload-json"
            accept="application/json"
            className="navmenu__file-input"
            onChange={handleLoadPreferencesFromJSON}
          />
        </MenuItem>
      </Menu>

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Modal.Header>Configure Report</Modal.Header>
        <Modal.Body className="ui-clean-forms">
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleDownloadReport}>
            Download Report
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NavMenu;

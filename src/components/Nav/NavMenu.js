// import React, { useState, useContext, useEffect } from "react";
// import "../../styles/NavBar.css";
// import IconButton from "@mui/material/IconButton";
// import MenuIcon from "@mui/icons-material/Menu";
// import FileDownloadTwoToneIcon from "@mui/icons-material/FileDownloadTwoTone";
// import SaveIcon from "@mui/icons-material/Save";
// import Menu from "@mui/material/Menu";
// import MenuItem from "@mui/material/MenuItem";
// import Dialog from "@mui/material/Dialog";
// import DialogTitle from "@mui/material/DialogTitle";
// import DialogContent from "@mui/material/DialogContent";
// import DialogActions from "@mui/material/DialogActions";
// import Checkbox from "@mui/material/Checkbox";
// import FormControlLabel from "@mui/material/FormControlLabel";
// import Button from "@mui/material/Button";
// import { DataContext } from "../../providers/DataProvider";
// import { GenerateCSV } from "../FileHandling/GenerateReport";

// export const NavMenu = () => {
//   const [anchorEl, setAnchorEl] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const { project, enabledFilters, selectedFilters, savedMetrics } =
//     useContext(DataContext);

//   const [includeRawData, setIncludeRawData] = useState(true);
//   const [includeFilteredData, setIncludeFilteredData] = useState(true);
//   const [includeSavedMetrics, setIncludeSavedMetrics] = useState(false);

//   const handleClick = (event) => setAnchorEl(event.currentTarget);
//   const handleClose = () => setAnchorEl(null);

//   const handleSaveProjectReport = () => {
//     setDialogOpen(true);
//     handleClose();
//   };

//   const handleDownloadReport = () => {
//     const csvContent = GenerateCSV(
//       project,
//       // enabledFilters,
//       selectedFilters,
//       includeRawData,
//       includeFilteredData,
//       includeSavedMetrics,
//       savedMetrics
//     );

//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.download = "project_report.csv";
//     link.style.visibility = "hidden";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     setDialogOpen(false);
//   };

//   const handleSavePreferencesAsJSON = () => {
//     // Prepare preferences data
//     const filtersAndMetrics = {
//       filters: selectedFilters,
//       metrics: savedMetrics,
//     };

//     // Convert to JSON and create a Blob
//     const jsonContent = JSON.stringify(filtersAndMetrics, null, 2); // 2-space indentation for readability
//     const blob = new Blob([jsonContent], { type: "application/json" });

//     // Create a download link and click it to download
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.download = "report_preferences.json";
//     link.style.visibility = "hidden";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     handleClose();
//   };

//   return (
//     <>
//       <IconButton onClick={handleClick}>
//         <MenuIcon />
//       </IconButton>
//       <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
//         <MenuItem onClick={handleSaveProjectReport}>
//           <FileDownloadTwoToneIcon />
//           Generate Report
//         </MenuItem>
//         <MenuItem onClick={handleSavePreferencesAsJSON}>
//           <SaveIcon />
//           Save Filters and Metrics
//         </MenuItem>
//         {/* Other menu items */}
//       </Menu>

//       <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
//         <DialogTitle>Configure Report</DialogTitle>
//         <DialogContent>
//           <FormControlLabel
//             control={
//               <Checkbox
//                 checked={includeRawData}
//                 onChange={(e) => setIncludeRawData(e.target.checked)}
//               />
//             }
//             label="Include Raw Data"
//           />
//           <FormControlLabel
//             control={
//               <Checkbox
//                 checked={includeFilteredData}
//                 onChange={(e) => setIncludeFilteredData(e.target.checked)}
//               />
//             }
//             label="Include Filtered Data"
//           />
//           <FormControlLabel
//             control={
//               <Checkbox
//                 checked={includeSavedMetrics}
//                 onChange={(e) => setIncludeSavedMetrics(e.target.checked)}
//               />
//             }
//             label="Include Saved Metrics"
//           />
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setDialogOpen(false)} color="secondary">
//             Cancel
//           </Button>
//           <Button onClick={handleDownloadReport} color="primary">
//             Download Report
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// };

// export default NavMenu;
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
import {
  StaticRatio_Filter,
  DynamicRatio_Filter,
  Div_Filter,
  Smoothing_Filter,
  ControlSubtraction_Filter,
  Derivative_Filter,
  OutlierRemoval_Filter,
  FlatFieldCorrection_Filter,
} from "../Graphing/FilteredData/FilterModels";

export const NavMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    project,
    enabledFilters,
    selectedFilters,
    savedMetrics,
    setSelectedFilters,
    setSavedMetrics,
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
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.filters && data.metrics) {
            let newFilters = [];
            data.filters.map((filter) => {
              if (filter.name === "Static Ratio") {
                newFilters.push(
                  new StaticRatio_Filter(filter.id, handleEditStaticRatioParams)
                );
              } else if (filter.name === "Smoothing") {
                newFilters.push(
                  new Smoothing_Filter(
                    filter.id,
                    handleEditSmoothingFilterParams
                  )
                );
              } else if (filter.name === "Control Subtraction") {
                newFilters.push(
                  new ControlSubtraction_Filter(
                    filter.id,
                    handleEditControlSubtractionFilterParams,
                    filter.number_of_columns,
                    filter.number_of_rows
                  )
                );
              } else if (filter.name === "Derivative") {
                newFilters.push(new Derivative_Filter(filter.id));
              } else if (filter.name === "Outlier Removal") {
                newFilters.push(
                  new OutlierRemoval_Filter(
                    filter.id,
                    handleEditOutlierRemovalFilterParams
                  )
                );
              } else if (filter.name === "Flat Field Correction") {
                newFilters.push(
                  new FlatFieldCorrection_Filter(
                    filter.id,
                    handleEditFlatFieldCorrectionFilterParams
                  )
                );
              }
            });
            setSelectedFilters(newFilters);
            setSavedMetrics(data.metrics);
            alert("Filters and metrics loaded successfully!");
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
      <IconButton onClick={handleClick}>
        <MenuIcon />
      </IconButton>
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
    </>
  );
};

export default NavMenu;

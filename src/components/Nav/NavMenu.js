// import React, { useState, useContext } from "react";
// import "../../styles/NavBar.css";
// import IconButton from "@mui/material/IconButton";
// import MenuIcon from "@mui/icons-material/Menu";
// import FileDownloadTwoToneIcon from "@mui/icons-material/FileDownloadTwoTone";
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
//   const { project, enabledFilters, savedMetrics } = useContext(DataContext);

//   const [includeRawData, setIncludeRawData] = useState(true);
//   const [includeFilteredData, setIncludeFilteredData] = useState(true);
//   const [includeSavedMetrics, setIncludeSavedMetrics] = useState(false);

//   const handleClick = (event) => setAnchorEl(event.currentTarget);
//   const handleClose = () => setAnchorEl(null);

//   const handleSaveProjectReport = () => {
//     // Open dialog for CSV configuration
//     setDialogOpen(true);
//     handleClose();
//   };

//   const handleDownloadReport = () => {
//     // Run GenerateCSV with user-defined options
//     const csvContent = GenerateCSV(
//       project,
//       enabledFilters,
//       includeRawData,
//       includeFilteredData,
//       // includeSavedMetrics ? savedMetrics : null
//       includeSavedMetrics,
//       savedMetrics
//     );

//     // Blob creation and download
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.download = "project_report.csv";
//     link.style.visibility = "hidden";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     setDialogOpen(false); // Close dialog after download
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
import React, { useState, useContext, useEffect } from "react";
import "../../styles/NavBar.css";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import FileDownloadTwoToneIcon from "@mui/icons-material/FileDownloadTwoTone";
import SaveIcon from "@mui/icons-material/Save";
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

export const NavMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { project, enabledFilters, selectedFilters, savedMetrics } =
    useContext(DataContext);

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
      // enabledFilters,
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
    // Prepare preferences data
    const filtersAndMetrics = {
      filters: selectedFilters,
      metrics: savedMetrics,
    };

    // Convert to JSON and create a Blob
    const jsonContent = JSON.stringify(filtersAndMetrics, null, 2); // 2-space indentation for readability
    const blob = new Blob([jsonContent], { type: "application/json" });

    // Create a download link and click it to download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "report_preferences.json";
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    handleClose();
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

// import React, { useState, useContext } from "react";
// import "../../styles/NavBar.css";
// import IconButton from "@mui/material/IconButton";
// import MenuIcon from "@mui/icons-material/Menu";
// import Menu from "@mui/material/Menu";
// import MenuItem from "@mui/material/MenuItem";
// import { DataContext } from "../../providers/DataProvider"; // Import the context
// import { GenerateCSV } from "../FileHandling/GenerateReport";

// export const NavMenu = () => {
//   const [anchorEl, setAnchorEl] = useState(null);
//   const { project, enabledFilters } = useContext(DataContext); // Get the project object from context

//   const handleClick = (event) => {
//     setAnchorEl(event.currentTarget);
//   };

//   const handleClose = () => {
//     setAnchorEl(null);
//   };

//   const handleSaveProjectReport = () => {
//     // Generate CSV content
//     const csvContent = GenerateCSV(project, enabledFilters);

//     // Create a Blob from the CSV content
//     const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

//     // Create a link element
//     const link = document.createElement("a");
//     const url = URL.createObjectURL(blob);
//     link.setAttribute("href", url);
//     link.setAttribute("download", "project_report.csv");
//     link.style.visibility = "hidden";

//     // Append link to the body and trigger the download
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     handleClose(); // Close the menu after saving
//   };

//   return (
//     <>
//       <IconButton onClick={handleClick}>
//         <MenuIcon />
//       </IconButton>
//       <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
//         <MenuItem onClick={handleSaveProjectReport}>
//           Save Project Report
//         </MenuItem>
//         {/* Other menu items */}
//       </Menu>
//     </>
//   );
// };

// export default NavMenu;
import React, { useState, useContext } from "react";
import "../../styles/NavBar.css";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
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
  const { project, enabledFilters, savedMetrics } = useContext(DataContext);

  const [includeRawData, setIncludeRawData] = useState(true);
  const [includeFilteredData, setIncludeFilteredData] = useState(true);
  const [includeSavedMetrics, setIncludeSavedMetrics] = useState(false);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSaveProjectReport = () => {
    // Open dialog for CSV configuration
    setDialogOpen(true);
    handleClose();
  };

  const handleDownloadReport = () => {
    // Run GenerateCSV with user-defined options
    const csvContent = GenerateCSV(
      project,
      enabledFilters,
      includeRawData,
      includeFilteredData,
      includeSavedMetrics ? savedMetrics : null
    );

    // Blob creation and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "project_report.csv";
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDialogOpen(false); // Close dialog after download
  };

  return (
    <>
      <IconButton onClick={handleClick}>
        <MenuIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleSaveProjectReport}>
          Save Project Report
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

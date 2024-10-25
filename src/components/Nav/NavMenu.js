import React, { useState, useContext } from "react";
import "../../styles/NavBar.css";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { DataContext } from "../../providers/DataProvider"; // Import the context
import { GenerateCSV } from "../FileHandling/GenerateReport";

export const NavMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { project, enabledFilters } = useContext(DataContext); // Get the project object from context

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSaveProjectReport = () => {
    // Generate CSV content
    const csvContent = GenerateCSV(project, enabledFilters);

    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Create a link element
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "project_report.csv");
    link.style.visibility = "hidden";

    // Append link to the body and trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    handleClose(); // Close the menu after saving
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
    </>
  );
};

export default NavMenu;

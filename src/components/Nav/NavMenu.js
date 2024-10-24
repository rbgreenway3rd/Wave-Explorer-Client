import React, { useState, useContext } from "react";
import "../../styles/NavBar.css";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { DataContext } from "../FileHandling/DataProvider"; // Import the context

export const NavMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { project } = useContext(DataContext); // Get the project object from context

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSaveProjectReport = () => {
    // Generate CSV content
    const csvContent = generateCSV(project);

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

  const generateCSV = (project) => {
    // Header section
    const header = ["<HEADER>"];

    project.plate.forEach((plate) => {
      plate.experiments.forEach((experiment) => {
        header.push(`Date\t${project.date}`);
        header.push(`Time\t${project.time}`);
        header.push(`Instrument\t${project.instrument}`);
        header.push(`ProtocolName\t${project.protocol}`);
        header.push(`AssayPlateBarcode\t${plate.assayPlateBarcode}`);
        header.push(`AddPlateBarcode\t${plate.addPlateBarcode}`);

        header.push(`Indicator\t${experiment.indicatorConfigurations}`);

        header.push(`Binning\t${experiment.binning}`);
        header.push(`NumRows\t${experiment.numberOfRows}`);
        header.push(`NumCols\t${experiment.numberOfColumns}`);
        header.push(`Operator\t${experiment.operator}`);
        header.push(`Project\t${project.title}`);
      });
    });

    // Closing the header section
    header.push("</HEADER>");

    // Join all the parts with line breaks to create the final CSV string
    return header.join("\r\n");
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

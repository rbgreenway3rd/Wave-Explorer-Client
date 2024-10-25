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
        header.push(`Date,${project.date}`);
        header.push(`Time,${project.time}`);
        header.push(`Instrument,${project.instrument}`);
        header.push(`ProtocolName,${project.protocol}`);
        header.push(`AssayPlateBarcode,${plate.assayPlateBarcode}`);
        header.push(`AddPlateBarcode,${plate.addPlateBarcode}`);
        header.push(`Indicator,${experiment.indicatorConfigurations}`);
        header.push(`Binning,${experiment.binning}`);
        header.push(`NumRows,${experiment.numberOfRows}`);
        header.push(`NumCols,${experiment.numberOfColumns}`);
        header.push(`Operator,${experiment.operator}`);
        header.push(`Project,${project.title}`);
      });
    });
    header.push("</HEADER>");

    // Indicator Data section
    const indicatorData = [];
    project.plate.forEach((plate) => {
      plate.experiments.forEach((experiment) => {
        // Iterate through each indicator
        experiment.wells[0].indicators.forEach((_, indicatorIndex) => {
          // Add <INDICATOR_DATA> for each indicator
          indicatorData.push(
            `<INDICATOR_DATA ${experiment.indicatorConfigurations}>`
          );

          // Header row: "Time" followed by well labels
          const wellHeaders = [
            "Time",
            ...experiment.wells.map((well) => well.label),
          ];
          indicatorData.push(wellHeaders.join(","));

          // Get time series length from the first well's indicator
          const numTimePoints =
            experiment.wells[0].indicators[indicatorIndex].time.length;

          // Construct rows for each time point
          // Construct rows for each time point
          for (let i = 0; i < numTimePoints; i++) {
            // Convert time from microseconds to milliseconds (e.g., 352 to 0.352)
            const timeInMilliseconds =
              experiment.wells[0].indicators[indicatorIndex].time[i] / 1000;

            // Start with converted time for the row
            const row = [timeInMilliseconds];

            // Add the rawData value for each well at the current time index
            experiment.wells.forEach((well) => {
              row.push(well.indicators[indicatorIndex].rawData[i].y);
            });

            indicatorData.push(row.join(","));
          }
          indicatorData.push("</INDICATOR_DATA>");
        });
      });
    });

    // Combine header and indicator data for the final CSV output
    return [...header, ...indicatorData].join("\r\n");
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

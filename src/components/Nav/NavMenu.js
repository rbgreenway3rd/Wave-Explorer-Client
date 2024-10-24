// import React, { useState } from "react";
// import "../../styles/NavBar.css";
// import IconButton from "@mui/material/IconButton";
// import MenuIcon from "@mui/icons-material/Menu";
// import Menu from "@mui/material/Menu";
// import MenuItem from "@mui/material/MenuItem";
// import { DataContext } from "../FileHandling/DataProvider";

// export const NavMenu = () => {
//   const [anchorEl, setAnchorEl] = useState(null); // State for menu anchor

//   const handleClick = (event) => {
//     setAnchorEl(event.currentTarget); // Open the menu
//   };

//   const handleClose = () => {
//     setAnchorEl(null); // Close the menu
//   };

//   return (
//     <>
//       <IconButton onClick={handleClick}>
//         <MenuIcon />
//       </IconButton>
//       <Menu
//         anchorEl={anchorEl} // Element to anchor the menu
//         open={Boolean(anchorEl)} // Menu open state
//         onClose={handleClose} // Close menu function
//       >
//         <MenuItem onClick={handleSaveProjectReport}>
//           Save Project Report
//         </MenuItem>
//         <MenuItem onClick={handleClose}>Item 2</MenuItem>
//         <MenuItem onClick={handleClose}>Item 3</MenuItem>
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
    const header = ["<HEADER></HEADER>"];
    // const header = [
    //   "Date",
    //   "Time",
    //   "Instrument",
    //   "ProtocolName",
    //   "AssayPlateBarcode",
    //   "AddPlateBarcode",
    //   "Indicator",
    //   "Binning",
    //   "NumRows",
    //   "NumCols",
    //   "Operator",
    //   "Project",
    // ];

    const rows = [];
    project.plate.forEach((plate) => {
      plate.experiments.forEach((experiment) => {
        // experiment.wells.forEach((well) => {
        //   well.indicators.forEach((indicator) => {
        const row = [
          project.date,
          project.time,
          project.instrument,
          project.protocol,
          plate.assayPlateBarcode,
          plate.addPlateBarcode,

          experiment.binning,
          `NumRows ${experiment.numberOfRows}`,
          `NumCols ${experiment.numberOfColumns}`,
          experiment.operator,
          project.title,
        ];
        rows.push(row.join("\n")); // Join the row values with commas
      });
    });
    //   });
    // });

    // Combine header and rows
    return [header.join("\t"), ...rows].join("\n"); // Join rows with new line
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

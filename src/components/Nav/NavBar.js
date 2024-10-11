import React, { useContext, useState } from "react";
import "../../styles/NavBar.css";
// import WaveGuideLogo from "../../assets/brand/WaveGuideLogo.gif"; // Import the gif file
import WaveGuideLogo from "../../../src/assets/brand/WaveGuideLogo.webp"; // Absolute path from src
import WaveGuideIcon from "../../../src/assets/brand/WaveGuideIcon.ico";
import WaveFrontLogo from "../../../src/assets/brand/WaveFrontLogo.webp";
import FileUploader from "../FileHandling/FileUploader";
import { DataContext } from "../FileHandling/DataProvider";

export const NavBar = () => {
  const {
    project,
    setProject,
    extractedRows,
    extractedColumns,
    extractedIndicatorTimes,
    analysisData,
    showFiltered,
    setShowFiltered,
    selectedWellArray,
    setSelectedWellArray,
  } = useContext(DataContext);

  const [wellArraysUpdated, setWellArraysUpdated] = useState(false);
  return (
    <header className="navbar-container">
      <section className="navbar-left">
        <FileUploader setWellArraysUpdated={setWellArraysUpdated} />
      </section>
      <section className="navbar-right">
        <img
          src={WaveGuideLogo}
          alt="WaveGuide logo"
          className="wave-explorer-icon"
        />{" "}
        <h1 className="logo">ave Explorer</h1>
      </section>
    </header>
  );
};

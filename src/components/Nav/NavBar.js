import React from "react";
import "../../styles/NavBar.css";
// import WaveGuideLogo from "../../assets/brand/WaveGuideLogo.gif"; // Import the gif file
import WaveGuideLogo from "../../../src/assets/brand/WaveGuideLogo.gif"; // Absolute path from src
import WaveGuideIcon from "../../../src/assets/brand/WaveGuideIcon.ico";

export const NavBar = () => {
  return (
    <header className="navbar-container">
      <h1 className="logo">Wave Explorer</h1>
      <img src={WaveGuideIcon} alt="WaveGuide Icon" />{" "}
      {/* Use the imported gif */}
    </header>
  );
};

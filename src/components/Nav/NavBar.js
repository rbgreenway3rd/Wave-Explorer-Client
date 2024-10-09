import React from "react";
import "../../styles/NavBar.css";
// import WaveGuideLogo from "../../assets/brand/WaveGuideLogo.gif"; // Import the gif file
import WaveGuideLogo from "../../../src/assets/brand/WaveGuideLogo.webp"; // Absolute path from src
import WaveGuideIcon from "../../../src/assets/brand/WaveGuideIcon.ico";
import WaveFrontLogo from "../../../src/assets/brand/WaveFrontLogo.webp";

export const NavBar = () => {
  return (
    <header className="navbar-container">
      <section className="navbar-left">
        <img
          src={WaveGuideLogo}
          alt="WaveGuide logo"
          className="wave-explorer-icon"
        />{" "}
        <h1 className="logo">ave Explorer</h1>
      </section>
      <section className="navbar-right">
        {/* <img
          src={WaveFrontLogo}
          alt="WaveFront Logo"
          className="wavefront-logo"
        />{" "} */}
      </section>
    </header>
  );
};

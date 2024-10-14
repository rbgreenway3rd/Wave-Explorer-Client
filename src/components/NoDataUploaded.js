import React from "react";
import "./NoDataUploaded.css";
import WaveFrontLogo from "../../src/assets/brand/WaveFrontLogo.webp";
import Typography from "@mui/material/Typography";

export const NoDataUploaded = () => {
  return (
    <div className="no-data-uploaded">
      <h1 className="header">
        <Typography className="header-text">
          No Project Data Detected
        </Typography>
        {/* <br /> */}
        <Typography className="header-text">
          Upload a File to Get Started
        </Typography>
      </h1>
      <section className="image-container">
        <img
          src={WaveFrontLogo}
          alt="WaveFront logo"
          className="wavefront-logo"
        />
      </section>
    </div>
  );
};

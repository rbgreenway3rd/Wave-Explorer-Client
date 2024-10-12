import React from "react";
import "./NoDataUploaded.css";
import WaveFrontLogo from "../../src/assets/brand/WaveFrontLogo.webp";
import Typography from "@mui/material/Typography";

export const NoDataUploaded = () => {
  return (
    <>
      <h1 className="header">
        <Typography className="header-text">
          No Project Data Detected
        </Typography>
      </h1>
      <div className="image-container">
        <img
          src={WaveFrontLogo}
          alt="WaveFront logo"
          className="wavefront-logo"
        />
      </div>
    </>
  );
};

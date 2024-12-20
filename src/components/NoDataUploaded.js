import React from "react";
import "./NoDataUploaded.css";
import WaveFrontLogo from "../../src/assets/brand/WaveFrontLogo.webp";
import Typography from "@mui/material/Typography";

export const NoDataUploaded = () => {
  return (
    <div className="no-data-uploaded">
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

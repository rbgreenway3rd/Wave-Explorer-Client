import React from "react";
import "./NoDataUploaded.css";
import WaveFront from "../assets/brand/WaveFront.png";

export const NoDataUploaded = () => {
  return (
    <div className="no-data-uploaded">
      <section className="image-container">
        <div className="logo-wrapper">
          <div className="logo-background"></div>
          <img
            src={WaveFront}
            alt="WaveFront logo"
            className="wavefront-logo"
          />
        </div>
      </section>
    </div>
  );
};

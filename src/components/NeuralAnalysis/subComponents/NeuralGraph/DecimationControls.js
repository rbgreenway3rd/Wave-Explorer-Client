import React from "react";
import {
  Box,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import "../../styles/DecimationControls.css";

const DecimationControls = ({
  decimationEnabled,
  setDecimationEnabled,
  decimationSamples,
  setDecimationSamples,
}) => {
  return (
    <div
      className="decimation-controls"
      style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
    >
      <button
        onClick={() => setDecimationEnabled((v) => !v)}
        style={{
          marginRight: 12,
          background: decimationEnabled ? "#00bcd4" : "#888",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "4px 12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {decimationEnabled ? "Decimation ON" : "Decimation OFF"}
      </button>
      <Box sx={{ ml: 2 }}>
        <FormLabel sx={{ color: "white" }}>Decimation Samples</FormLabel>
        <RadioGroup
          row
          value={decimationSamples}
          onChange={(e) => setDecimationSamples(Number(e.target.value))}
          aria-label="decimation-samples"
          name="decimation-samples"
        >
          {[50, 100, 200, 400].map((val) => (
            <FormControlLabel
              key={val}
              value={val}
              control={
                <Radio
                  sx={{
                    color: "#00bcd4",
                    "&.Mui-checked": { color: "#00bcd4" },
                  }}
                />
              }
              label={val}
              // disabled={!decimationEnabled}
            />
          ))}
        </RadioGroup>
      </Box>
    </div>
  );
};

export default DecimationControls;

import React from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { Panel } from "../../../../ui";
import "./NeuralToggle.css";

/**
 * HandleOutliersToggle — ON/OFF switch for outlier detection. Uses the
 * `dark` Panel variant + shared `.neural-toggle` styling. Accent is the
 * status-warning orange.
 */
const HandleOutliersToggle = ({ handleOutliers, setHandleOutliers }) => {
  return (
    <Panel
      variant="dark"
      className="neural-toggle ui-panel--rounded-lg"
      style={{ "--neural-toggle-accent": "var(--color-warning)" }}
    >
      <span className="neural-toggle__label">Handle Outliers</span>
      <FormControlLabel
        control={
          <Switch
            checked={handleOutliers}
            onChange={(e) => setHandleOutliers(e.target.checked)}
            size="small"
          />
        }
        label=""
        sx={{ margin: 0 }}
      />
    </Panel>
  );
};

export default HandleOutliersToggle;

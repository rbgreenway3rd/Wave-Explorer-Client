import React from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { Panel } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import "./NeuralToggle.css";

/**
 * HandleOutliersToggle — ON/OFF switch for outlier detection. Reads its
 * own state from NeuralSettingsContext directly so parent routers don't
 * thread `handleOutliers` / `setHandleOutliers`.
 */
const HandleOutliersToggle = () => {
  const { handleOutliers, setHandleOutliers } = useNeuralSettings();
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

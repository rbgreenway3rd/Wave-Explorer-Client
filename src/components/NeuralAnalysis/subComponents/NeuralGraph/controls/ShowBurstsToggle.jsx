import React from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { Panel } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import "./NeuralToggle.css";

/**
 * ShowBurstsToggle — ON/OFF switch for burst overlay on the neural
 * graph. Reads its own state directly from NeuralSettingsContext, so
 * parent routers don't need to thread `showBursts` / `setShowBursts`.
 */
const ShowBurstsToggle = () => {
  const { showBursts, setShowBursts } = useNeuralSettings();
  return (
    <Panel
      variant="dark"
      className="neural-toggle ui-panel--rounded-lg"
      style={{ "--neural-toggle-accent": "var(--color-info)" }}
    >
      <span className="neural-toggle__label">Show Bursts</span>
      <FormControlLabel
        control={
          <Switch
            checked={showBursts}
            onChange={(e) => setShowBursts(e.target.checked)}
            size="small"
          />
        }
        label=""
        sx={{ margin: 0 }}
      />
    </Panel>
  );
};

export default ShowBurstsToggle;

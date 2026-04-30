import React from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { Panel } from "../../../../ui";
import "./NeuralToggle.css";

/**
 * ShowBurstsToggle — ON/OFF switch for burst overlay on the neural
 * graph. Uses the `dark` Panel variant + shared `.neural-toggle`
 * styling. Accent is the secondary cyan to distinguish from the
 * warning-orange outlier toggle.
 */
const ShowBurstsToggle = ({ showBursts, setShowBursts }) => {
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

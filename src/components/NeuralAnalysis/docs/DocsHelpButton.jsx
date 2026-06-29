import React from "react";
import { Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { IconButton } from "../../ui";
import { useNeuralDocs } from "./NeuralDocsContext";
import "./DocsHelpButton.css";

/**
 * DocsHelpButton — a small "?" that opens the interactive documentation
 * at a specific section. Drop it next to any control or panel header:
 *
 *   <DocsHelpButton sectionId="param-prominence" />
 *
 * Renders nothing when there's no NeuralDocsContext provider, so it's
 * safe to use anywhere inside the neural modal. `stopPropagation` keeps
 * a click from also toggling a surrounding accordion/section button.
 */
const DocsHelpButton = ({
  sectionId,
  label = "What does this do?",
  className = "",
}) => {
  const { openDocs } = useNeuralDocs();
  if (!openDocs) return null;

  return (
    <Tooltip title={label} arrow>
      <IconButton
        variant="subtle"
        size="sm"
        aria-label={label}
        className={`neural-docs-help-btn ${className}`.trim()}
        onClick={(e) => {
          e.stopPropagation();
          openDocs(sectionId);
        }}
      >
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default DocsHelpButton;

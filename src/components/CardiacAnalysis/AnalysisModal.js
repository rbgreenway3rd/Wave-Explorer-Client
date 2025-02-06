import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const CardiacAnalysisModal = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={null} fullScreen>
      <DialogTitle>
        Cardiac Analysis
        <Tooltip title="Exit Cardiac Analysis" arrow>
          <IconButton
            aria-label="close"
            onClick={onClose}
            style={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon sx={{}} />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent>{/* Modal content goes here */}</DialogContent>
    </Dialog>
  );
};

export default CardiacAnalysisModal;

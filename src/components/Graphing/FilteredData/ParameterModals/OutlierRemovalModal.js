import React, { useState, useRef, useEffect } from "react";
import {
  useSelectionContainer,
  Box,
  boxesIntersect,
} from "@air/react-drag-to-select";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";

import { Delete } from "@mui/icons-material";
export const OutlierRemovalFilterModal = ({
  open,
  onClose,
  halfWindow,
  setHalfWindow,
  threshold,
  setThreshold,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit "half window" Parameter</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Half Window"
          type="number"
          fullWidth
          value={halfWindow}
          onChange={(e) => setHalfWindow(Number(e.target.value))}
          inputProps={{ min: 1, max: 10 }} // Enforce allowed range
        />
      </DialogContent>
      <DialogTitle>Edit "threshold" Parameter</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Threshold"
          type="number"
          fullWidth
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          inputProps={{ min: 1, max: 10 }} // Enforce allowed range
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Confirm</Button>
      </DialogActions>
    </Dialog>
  );
};

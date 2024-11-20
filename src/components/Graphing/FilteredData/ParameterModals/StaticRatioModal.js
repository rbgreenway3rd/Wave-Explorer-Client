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

export const StaticRatioModal = ({
  open,
  onClose,
  startValue,
  setStartValue,
  endValue,
  setEndValue,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Static Ratio Filter Parameters</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Start Value"
          type="number"
          fullWidth
          value={startValue}
          onChange={(e) => setStartValue(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="End Value"
          type="number"
          fullWidth
          value={endValue}
          onChange={(e) => setEndValue(Number(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Confirm</Button>
      </DialogActions>
    </Dialog>
  );
};

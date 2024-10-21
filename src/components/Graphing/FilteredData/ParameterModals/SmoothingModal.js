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
export const SmoothingFilterModal = ({
  open,
  onClose,
  windowWidth,
  setWindowWidth,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Smoothing Filter Sliding Window Parameter</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Sliding Window Width"
          type="number"
          fullWidth
          value={windowWidth}
          onChange={(e) => setWindowWidth(Number(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

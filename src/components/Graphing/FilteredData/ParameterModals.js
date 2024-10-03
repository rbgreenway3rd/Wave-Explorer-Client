import React, { useState } from "react";
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
        <Button onClick={onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

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

export const ControlSubtractionModal = ({
  open,
  onClose,
  controlWellArray,
  setControlWellArray,
  applyWellArray,
  setApplyWellArray,
  onSave,
}) => {
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);

  const handleAddControlWell = () => {
    setControlWellArray([...controlWellArray, { row, col }]);
    setRow(0);
    setCol(0);
  };

  const handleAddApplyWell = () => {
    setApplyWellArray([...applyWellArray, { row, col }]);
    setRow(0);
    setCol(0);
  };

  const handleRemoveControlWell = (index) => {
    const newList = controlWellArray.filter((_, i) => i !== index);
    setControlWellArray(newList);
  };

  const handleRemoveApplyWell = (index) => {
    const newList = applyWellArray.filter((_, i) => i !== index);
    setApplyWellArray(newList);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Control Subtraction Filter Parameters</DialogTitle>
      <DialogContent>
        {/* Control Wells Section */}
        <h4>Control Wells</h4>
        <List>
          {controlWellArray.map((well, index) => (
            <ListItem key={index}>
              <ListItemText primary={`Row: ${well.row}, Col: ${well.col}`} />
              <IconButton onClick={() => handleRemoveControlWell(index)}>
                <Delete />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <TextField
          margin="dense"
          label="Row"
          type="number"
          fullWidth
          value={row}
          onChange={(e) => setRow(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="Column"
          type="number"
          fullWidth
          value={col}
          onChange={(e) => setCol(Number(e.target.value))}
        />
        <Button onClick={handleAddControlWell}>Add Control Well</Button>

        {/* Apply Wells Section */}
        <h4>Apply Wells</h4>
        <List>
          {applyWellArray.map((well, index) => (
            <ListItem key={index}>
              <ListItemText primary={`Row: ${well.row}, Col: ${well.col}`} />
              <IconButton onClick={() => handleRemoveApplyWell(index)}>
                <Delete />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <TextField
          margin="dense"
          label="Row"
          type="number"
          fullWidth
          value={row}
          onChange={(e) => setRow(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="Column"
          type="number"
          fullWidth
          value={col}
          onChange={(e) => setCol(Number(e.target.value))}
        />
        <Button onClick={handleAddApplyWell}>Add Apply Well</Button>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

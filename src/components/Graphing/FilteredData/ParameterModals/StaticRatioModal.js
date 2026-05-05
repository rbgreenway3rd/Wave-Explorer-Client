import React from "react";
import { TextField } from "@mui/material";
import { Button, Modal } from "../../../ui";

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
    <Modal open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Modal.Header>Edit Static Ratio Filter Parameters</Modal.Header>
      <Modal.Body>
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
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave}>
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

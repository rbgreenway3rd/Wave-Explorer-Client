import React from "react";
import {
  TextField,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { Button, Modal } from "../../../ui";

export const SmoothingFilterModal = ({
  open,
  onClose,
  windowWidth,
  setWindowWidth,
  useMedian,
  setUseMedian,
  onSave,
}) => {
  return (
    <Modal open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Modal.Header>Edit Smoothing Filter Parameters</Modal.Header>
      <Modal.Body className="ui-clean-forms">
        <TextField
          label="Window Width"
          type="number"
          value={windowWidth}
          onChange={(e) => setWindowWidth(Number(e.target.value))}
          fullWidth
          margin="normal"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={useMedian}
              onChange={(e) => setUseMedian(e.target.checked)}
            />
          }
          label="Use Median Instead of Average"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

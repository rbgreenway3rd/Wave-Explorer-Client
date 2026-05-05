import React from "react";
import { TextField } from "@mui/material";
import { Button, Modal, Heading } from "../../../ui";

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
    <Modal open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Modal.Header>Edit Outlier Removal Parameters</Modal.Header>
      <Modal.Body>
        <Heading level={4}>Half Window</Heading>
        <TextField
          autoFocus
          margin="dense"
          label="Half Window"
          type="number"
          fullWidth
          value={halfWindow}
          onChange={(e) => setHalfWindow(Number(e.target.value))}
          inputProps={{ min: 1, max: 10 }}
        />
        <Heading level={4} style={{ marginTop: "var(--space-3)" }}>
          Threshold
        </Heading>
        <TextField
          margin="dense"
          label="Threshold"
          type="number"
          fullWidth
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          inputProps={{ min: 1, max: 10 }}
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

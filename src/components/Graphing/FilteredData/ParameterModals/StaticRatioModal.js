import React from "react";
import { TextField, FormControlLabel, Checkbox, Typography } from "@mui/material";
import { Button, Modal } from "../../../ui";

export const StaticRatioModal = ({
  open,
  onClose,
  startValue,
  setStartValue,
  endValue,
  setEndValue,
  rescaleByMedianFo,
  setRescaleByMedianFo,
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
        <FormControlLabel
          control={
            <Checkbox
              checked={!!rescaleByMedianFo}
              onChange={(e) => setRescaleByMedianFo(e.target.checked)}
            />
          }
          label="Rescale by plate-median Fo (well-to-well comparison)"
        />
        <Typography variant="caption" color="text.secondary" display="block">
          Multiplies each well's F/Fo by the plate-wide median baseline (per
          indicator) so peak height and AUC are comparable across wells and the
          y-scale stays sensible for neural analysis.
        </Typography>
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

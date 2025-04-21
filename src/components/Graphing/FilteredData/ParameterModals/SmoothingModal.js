// import React, { useState, useRef, useEffect } from "react";
// import {
//   useSelectionContainer,
//   Box,
//   boxesIntersect,
// } from "@air/react-drag-to-select";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   TextField,
//   List,
//   ListItem,
//   ListItemText,
//   IconButton,
// } from "@mui/material";

// import { Delete } from "@mui/icons-material";
// export const SmoothingFilterModal = ({
//   open,
//   onClose,
//   windowWidth,
//   setWindowWidth,
//   onSave,
// }) => {
//   return (
//     <Dialog open={open} onClose={onClose}>
//       <DialogTitle>Edit Smoothing Filter Sliding Window Parameter</DialogTitle>
//       <DialogContent>
//         <TextField
//           autoFocus
//           margin="dense"
//           label="Sliding Window Width"
//           type="number"
//           fullWidth
//           value={windowWidth}
//           onChange={(e) => setWindowWidth(Number(e.target.value))}
//         />
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button onClick={onSave}>Confirm</Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

import React from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
} from "@mui/material";

export const SmoothingFilterModal = ({
  open,
  onClose,
  windowWidth,
  setWindowWidth,
  useMedian,
  setUseMedian,
  onSave,
}) => {
  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 4,
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6">Edit Smoothing Filter Parameters</Typography>
        <TextField
          label="Window Width"
          type="number"
          value={windowWidth}
          onChange={(e) => setWindowWidth(Number(e.target.value))}
          fullWidth
          margin="normal"
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <FormControlLabel
            sx={{ backgroundColor: "white", borderBottom: "none" }}
            control={
              <Checkbox
                checked={useMedian}
                onChange={(e) => setUseMedian(e.target.checked)}
              />
            }
            label="Use Median Instead of Average"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={onSave}
            sx={{ mt: 2, margin: "none", verticalAlign: "bottom" }}
          >
            Save
          </Button>
        </div>
      </Box>
    </Modal>
  );
};

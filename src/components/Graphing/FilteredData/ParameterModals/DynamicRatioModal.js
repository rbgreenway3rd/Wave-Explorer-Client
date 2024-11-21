import React, { useState, useRef, useEffect, useContext } from "react";
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
  Typography,
  FormControl,
  FormControlLabel,
  FormGroup,
  RadioGroup,
  Radio,
} from "@mui/material";

import { Delete } from "@mui/icons-material";
import { DataContext } from "../../../../providers/DataProvider";

export const DynamicRatioModal = ({
  open,
  onClose,
  numerator,
  setNumerator,
  denominator,
  setDenominator,
  onSave,
}) => {
  const { extractedIndicators } = useContext(DataContext);
  //   return (
  //     <Dialog open={open} onClose={onClose}>
  //       <DialogTitle>Edit Dynamic Ratio Filter Parameters</DialogTitle>
  //       <DialogContent>
  //         <TextField
  //           autoFocus
  //           margin="dense"
  //           label="Numerator"
  //           type="number"
  //           fullWidth
  //           value={numerator}
  //           onChange={(e) => setNumerator(Number(e.target.value))}
  //         />
  //         <TextField
  //           margin="dense"
  //           label="Denominator"
  //           type="number"
  //           fullWidth
  //           value={denominator}
  //           onChange={(e) => setDenominator(Number(e.target.value))}
  //         />
  //       </DialogContent>
  //       <DialogActions>
  //         <Button onClick={onClose}>Cancel</Button>
  //         <Button onClick={onSave}>Confirm</Button>
  //       </DialogActions>
  //     </Dialog>
  //   );
  // };
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Dynamic Ratio Filter Parameters</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          Select Numerator Indicator:
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup
            value={numerator}
            onChange={(e) => setNumerator(Number(e.target.value))}
          >
            {extractedIndicators.map((indicator, index) => (
              <FormControlLabel
                key={`numerator-${index}`}
                value={index}
                control={<Radio />}
                label={indicator.indicatorName || `Indicator ${index + 1}`}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
          Select Denominator Indicator:
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup
            value={denominator}
            onChange={(e) => setDenominator(Number(e.target.value))}
          >
            {extractedIndicators.map((indicator, index) => (
              <FormControlLabel
                key={`denominator-${index}`}
                value={index}
                control={<Radio />}
                label={indicator.indicatorName || `Indicator ${index + 1}`}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Confirm</Button>
      </DialogActions>
    </Dialog>
  );
};

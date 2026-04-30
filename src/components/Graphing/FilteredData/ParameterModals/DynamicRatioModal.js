import React, { useContext } from "react";
import {
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
} from "@mui/material";
import { Button, Modal, Heading } from "../../../ui";
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

  return (
    <Modal open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Modal.Header>Edit Dynamic Ratio Filter Parameters</Modal.Header>
      <Modal.Body className="ui-clean-forms">
        <Heading level={4}>Select Numerator Indicator</Heading>
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

        <Heading level={4} style={{ marginTop: "var(--space-3)" }}>
          Select Denominator Indicator
        </Heading>
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

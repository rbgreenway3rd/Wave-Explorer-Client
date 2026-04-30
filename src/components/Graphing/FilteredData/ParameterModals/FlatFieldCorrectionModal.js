import React, { useState, useEffect } from "react";
import { Button, Modal, Text } from "../../../ui";

export const FlatFieldCorrectionModal = ({
  open,
  onClose,
  correctionMatrix,
  setCorrectionMatrix,
  onSave,
}) => {
  const [file, setFile] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);

  // Function to parse CSV text into a flat array of integers
  const parseCSVToArray = (csvText) => {
    return csvText
      .trim()
      .split(/\r?\n/)
      .flatMap((row) => row.split(",").map(Number));
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const parsedMatrix = parseCSVToArray(text);
        setCorrectionMatrix(parsedMatrix);
        setIsUploaded(true);
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (isUploaded && correctionMatrix && correctionMatrix.length > 0) {
      onSave(correctionMatrix);
      setIsUploaded(false);
    }
  }, [isUploaded, correctionMatrix, onSave]);

  return (
    <Modal open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Modal.Header>Upload Correction Matrix File</Modal.Header>
      <Modal.Body>
        <Text size="sm" tone="muted">
          Upload a CSV containing the correction factor for each well.
        </Text>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ marginTop: "var(--space-2)" }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleUpload} disabled={!file}>
          Upload
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

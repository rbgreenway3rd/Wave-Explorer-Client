import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

export const FlatFieldCorrectionModal = ({
  open,
  onClose,
  correctionMatrix,
  setCorrectionMatrix,
  onSave,
}) => {
  const [file, setFile] = useState(null);
  const [isUploaded, setIsUploaded] = useState(false);

  // Function to parse CSV text into a 2D array of integers
  const parseCSVToArray = (csvText) => {
    return csvText
      .trim()
      .split(/\r?\n/) // Split into rows
      .flatMap((row) => row.split(",").map(Number)); // Split each row by commas, convert to numbers, and flatten
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]); // Set the selected file
  };

  const handleUpload = () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const parsedMatrix = parseCSVToArray(text);

        setCorrectionMatrix(parsedMatrix); // Set the parsed matrix
        setIsUploaded(true); // Trigger effect to handle save and close
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    // Trigger onSave and onClose only if matrix is set and upload completed
    if (isUploaded && correctionMatrix && correctionMatrix.length > 0) {
      onSave();
      onClose();
      setIsUploaded(false); // Reset flag for next upload
    }
  }, [isUploaded, correctionMatrix, onSave, onClose]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Upload Correction Matrix File</DialogTitle>
      <DialogContent>
        <input type="file" accept=".csv" onChange={handleFileChange} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleUpload} disabled={!file}>
          Upload
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

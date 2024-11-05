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

// export const FlatFieldCorrectionModal = ({
//   open,
//   onClose,
//   onSubmit,
//   correctionMatrix,
//   setCorrectionMatrix,
//   onSave,
// }) => {
//   const [file, setFile] = useState(null);

//   const parseCSVToArray = (csvText) => {
//     // Split by newline and commas, then parse to integers
//     return csvText
//       .trim()
//       .split(/\r?\n/)
//       .map((row) => row.split(",").map(Number)); // assuming a 2D correction array
//   };

//   const handleFileChange = (event) => {
//     setFile(event.target.files[0]);
//   };

//   const handleUpload = () => {
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const text = e.target.result;
//         const correctionMatrix = parseCSVToArray(text); // Parse CSV to array of integers
//         setCorrectionMatrix(correctionMatrix);
//         onClose();
//       };
//       reader.readAsText(file);
//     }
//   };

//   return (
//     <Dialog open={open} onClose={onClose}>
//       <DialogTitle>Upload Correction Matrix File</DialogTitle>
//       <DialogContent>
//         <input type="file" accept=".csv" onChange={handleFileChange} />
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={handleUpload}>Upload</Button>
//         <Button onClick={onClose}>Cancel</Button>
//         {/* <Button onClick={onSave}>Save</Button> */}
//       </DialogActions>
//     </Dialog>
//   );
// };
import React, { useState } from "react";
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

  // Function to parse CSV text into a 2D array of integers
  const parseCSVToArray = (csvText) => {
    // Split by newline, then by commas, and flatten all rows into a single array
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

        setCorrectionMatrix(parsedMatrix); // Update the correctionMatrix in parent state
        // Optional: add a confirmation step here if needed
      };
      reader.readAsText(file);
    }
  };

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
        <Button
          onClick={() => {
            onSave(); // Confirm save action explicitly
            onClose(); // Then close the modal
          }}
        >
          Save
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

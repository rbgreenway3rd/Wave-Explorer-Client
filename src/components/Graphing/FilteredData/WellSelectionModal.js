import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import GridCanvas from "./GridCanvas";
import OverlayCanvas from "./OverlayCanvas";

const modalStyle = {
  position: "absolute",
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  display: "flex",
  flexDirection: "column",
  p: 2,
};

const WellSelectionModal = ({ onFilterApply }) => {
  const [open, setOpen] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 400, height: 400 });
  const [selectedCells, setSelectedCells] = useState([]);

  const handleOpen = () => {
    setOpen(true);
    const modalWidth = window.innerWidth * 0.7;
    const modalHeight = window.innerHeight * 0.7;
    setModalSize({ width: modalWidth, height: modalHeight });
  };

  const handleClose = () => {
    setOpen(false);
    onFilterApply(selectedCells);
  };

  const handleSelection = (newCells) => {
    setSelectedCells((prevSelectedCells) => {
      const updatedCells = [...prevSelectedCells];
      newCells.forEach((newCell) => {
        const cellIndex = updatedCells.findIndex(
          (cell) => cell.row === newCell.row && cell.col === newCell.col
        );
        if (cellIndex !== -1) {
          updatedCells.splice(cellIndex, 1);
        } else {
          updatedCells.push(newCell);
        }
      });
      return updatedCells;
    });
  };

  return (
    <div>
      <Button onClick={handleOpen}>Select Wells</Button>
      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2">
            Well Selection
          </Typography>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <GridCanvas
              width={modalSize.width}
              height={modalSize.height}
              selectedCells={selectedCells}
            />
            <OverlayCanvas
              width={modalSize.width}
              height={modalSize.height}
              onSelect={handleSelection}
            />
          </Box>
          <Button onClick={handleClose}>Confirm Well Selection</Button>
        </Box>
      </Modal>
    </div>
  );
};

export default WellSelectionModal;

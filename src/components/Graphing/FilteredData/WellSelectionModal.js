import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import GridCanvas from "./GridCanvas";
import OverlayCanvas from "./OverlayCanvas";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%",
  maxWidth: 800,
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
    // console.log("selected cells: ", selectedCells);
  };

  const handleSelection = (cells) => {
    setSelectedCells(cells);
  };

  return (
    <div>
      <Button onClick={handleOpen}>Settings</Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
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
          <Button onClick={handleClose}>Apply Filters</Button>
        </Box>
      </Modal>
    </div>
  );
};

export default WellSelectionModal;

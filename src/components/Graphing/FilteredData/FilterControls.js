import React, { useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import "./Configuration/FilterControls.css";
import { createPortal } from "react-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import Heatmap from "../Heatmap/Heatmap";

const GridCanvas = () => {
  // grid width and height
  const columns = 24;
  const rows = 16;
  const cellSize = 25; // size of each cell in the grid
  const bw = columns * cellSize;
  const bh = rows * cellSize;
  // padding around grid
  const p = 10;
  // size of canvas
  const cw = bw + p * 2 + 1;
  const ch = bh + p * 2 + 1;

  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    function drawBoard() {
      for (let x = 0; x <= bw; x += cellSize) {
        context.moveTo(0.5 + x + p, p);
        context.lineTo(0.5 + x + p, bh + p);
      }

      for (let y = 0; y <= bh; y += cellSize) {
        context.moveTo(p, 0.5 + y + p);
        context.lineTo(bw + p, 0.5 + y + p);
      }

      context.strokeStyle = "black";
      context.stroke();
    }

    drawBoard();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={cw}
      height={ch}
      style={{ border: "1px solid black" }}
    />
  );
};

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

export default function BasicModal() {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <div>
      <Button onClick={handleOpen}>Settings</Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Text in a modal
          </Typography>
          <GridCanvas />
        </Box>
      </Modal>
    </div>
  );
}

export const FilterControls = (
  {
    //inherited data
  }
) => {
  return (
    <div className="filter-controls-container">
      <div className="filter-list-container">
        <div className="filter-save-status">unsaved</div>
        <ul className="selected-filter-list">
          <li className="filter-list-item">
            <input
              className="filter-list-item-checkbox"
              type="checkbox"
              name="filter"
              id="filter1"
            />
            <label className="filter-list-item-label" for="filter1">
              filter 1
            </label>
            <BasicModal />
            {/* <button className="filter-list-item-settings-button">.</button> */}
          </li>
        </ul>
      </div>
      <div className="filter-list-order">
        <button className="add-filter-button filter-list-order-edit-button">
          +
        </button>
        <button className="move-up-filter-button filter-list-order-edit-button">
          ^
        </button>
        <button className="move-down-filter-button filter-list-order-edit-button">
          v
        </button>
        <button className="remove-filter-button filter-list-order-edit-button">
          x
        </button>
      </div>
    </div>
  );
};

// import React, { useRef, useEffect, useState } from "react";
// import Box from "@mui/material/Box";
// import Button from "@mui/material/Button";
// import Typography from "@mui/material/Typography";
// import Modal from "@mui/material/Modal";

// const GridCanvas = ({ width, height }) => {
//   const [canvasSize, setCanvasSize] = useState({ width, height });

//   useEffect(() => {
//     setCanvasSize({ width, height });
//   }, [width, height]);

//   const columns = 24;
//   const rows = 16;
//   const cellWidth = canvasSize.width / columns;
//   const cellHeight = canvasSize.height / rows;

//   const canvasRef = useRef(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const context = canvas.getContext("2d");

//     function drawBoard() {
//       context.clearRect(0, 0, canvas.width, canvas.height);
//       for (let x = 0; x <= canvasSize.width; x += cellWidth) {
//         context.moveTo(x, 0);
//         context.lineTo(x, canvasSize.height);
//       }
//       for (let y = 0; y <= canvasSize.height; y += cellHeight) {
//         context.moveTo(0, y);
//         context.lineTo(canvasSize.width, y);
//       }
//       context.strokeStyle = "black";
//       context.stroke();
//     }

//     drawBoard();
//   }, [canvasSize, cellWidth, cellHeight]);

//   return (
//     <canvas
//       ref={canvasRef}
//       width={canvasSize.width}
//       height={canvasSize.height}
//       style={{ border: "1px solid black", width: "100%", height: "100%" }}
//     />
//   );
// };

// const style = {
//   position: "absolute",
//   top: "50%",
//   left: "50%",
//   transform: "translate(-50%, -50%)",
//   width: "80%",
//   maxWidth: 800,
//   bgcolor: "background.paper",
//   border: "2px solid #000",
//   boxShadow: 24,
//   p: 4,
// };

// export default function BasicModal() {
//   const [open, setOpen] = useState(false);
//   const [modalSize, setModalSize] = useState({ width: 400, height: 400 });

//   const handleOpen = () => {
//     setOpen(true);
//     const modalWidth = window.innerWidth * 0.7;
//     const modalHeight = window.innerHeight * 0.7;
//     setModalSize({ width: modalWidth, height: modalHeight });
//   };

//   const handleClose = () => setOpen(false);

//   return (
//     <div>
//       <Button onClick={handleOpen}>Settings</Button>
//       <Modal
//         open={open}
//         onClose={handleClose}
//         aria-labelledby="modal-modal-title"
//         aria-describedby="modal-modal-description"
//       >
//         <Box
//           sx={{ ...style, width: modalSize.width, height: modalSize.height }}
//         >
//           <Typography id="modal-modal-title" variant="h6" component="h2">
//             Text in a modal
//           </Typography>
//           <GridCanvas
//             width={modalSize.width - 40}
//             height={modalSize.height - 100}
//           />
//         </Box>
//       </Modal>
//     </div>
//   );
// }
// export const FilterControls = (
//   {
//     //inherited data
//   }
// ) => {
//   return (
//     <div className="filter-controls-container">
//       <div className="filter-list-container">
//         <div className="filter-save-status">unsaved</div>
//         <ul className="selected-filter-list">
//           <li className="filter-list-item">
//             <input
//               className="filter-list-item-checkbox"
//               type="checkbox"
//               name="filter"
//               id="filter1"
//             />
//             <label className="filter-list-item-label" for="filter1">
//               filter 1
//             </label>
//             <BasicModal />
//             {/* <button className="filter-list-item-settings-button">.</button> */}
//           </li>
//         </ul>
//       </div>
//       <div className="filter-list-order">
//         <button className="add-filter-button filter-list-order-edit-button">
//           +
//         </button>
//         <button className="move-up-filter-button filter-list-order-edit-button">
//           ^
//         </button>
//         <button className="move-down-filter-button filter-list-order-edit-button">
//           v
//         </button>
//         <button className="remove-filter-button filter-list-order-edit-button">
//           x
//         </button>
//       </div>
//     </div>
//   );
// };
import React, { useRef, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";

const GridCanvas = ({ width, height }) => {
  const [canvasSize, setCanvasSize] = useState({ width, height });

  useEffect(() => {
    setCanvasSize({ width, height });
  }, [width, height]);

  const columns = 24;
  const rows = 16;
  const cellWidth = canvasSize.width / columns;
  const cellHeight = canvasSize.height / rows;

  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    function drawBoard() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (let x = 0; x <= canvasSize.width; x += cellWidth) {
        context.moveTo(x, 0);
        context.lineTo(x, canvasSize.height);
      }
      for (let y = 0; y <= canvasSize.height; y += cellHeight) {
        context.moveTo(0, y);
        context.lineTo(canvasSize.width, y);
      }
      context.strokeStyle = "black";
      context.stroke();
    }

    drawBoard();
  }, [canvasSize, cellWidth, cellHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      style={{ border: "1px solid black", width: "100%", height: "100%" }}
    />
  );
};

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%",
  maxWidth: 800,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  display: "flex", // Flexbox to manage the layout
  flexDirection: "column", // Arrange children vertically
  p: 2, // Reduce padding to prevent overlap
};

export default function WellSelectionModal() {
  const [open, setOpen] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 400, height: 400 });

  const handleOpen = () => {
    setOpen(true);
    const modalWidth = window.innerWidth * 0.7;
    const modalHeight = window.innerHeight * 0.7;
    setModalSize({ width: modalWidth, height: modalHeight });
  };

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
        <Box
          sx={{ ...style, width: modalSize.width, height: modalSize.height }}
        >
          <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            sx={{ mb: 2 }} // Add margin-bottom to the title
          >
            Text in a modal
          </Typography>
          <Box sx={{ flex: 1, display: "flex" }}>
            <GridCanvas
              width={modalSize.width - 40}
              height={modalSize.height - 100}
            />
          </Box>
          <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            sx={{ mb: 2 }} // Add margin-bottom to the title
          >
            Text in a modal
          </Typography>
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
            <WellSelectionModal />
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

// import React, { useState } from "react";
// import Box from "@mui/material/Box";
// import Button from "@mui/material/Button";
// import Typography from "@mui/material/Typography";
// import Modal from "@mui/material/Modal";
// import { listOfFilters } from "./FilterFunctions";
// import { useFilters } from "./FilterContext";

// const modalStyle = {
//   position: "absolute",
//   top: "50%",
//   left: "50%",
//   transform: "translate(-50%, -50%)",
//   width: "80%",
//   maxWidth: 800,
//   bgcolor: "background.paper",
//   border: "2px solid #000",
//   boxShadow: 24,
//   display: "flex",
//   flexDirection: "column",
//   p: 2,
// };

// const FilterSelectionModal = ({ onFilterApply }) => {
//   const [open, setOpen] = useState(false);
//   const { selectedFilters, toggleFilter } = useFilters();

//   const handleOpen = () => setOpen(true);

//   const handleClose = () => setOpen(false);

//   const handleConfirm = () => {
//     setOpen(false);
//     onFilterApply(selectedFilters); // Apply the list of selected filters
//   };

//   return (
//     <div>
//       <Button onClick={handleOpen}>+</Button>
//       <Modal
//         open={open}
//         onClose={handleClose}
//         aria-labelledby="modal-modal-title"
//         aria-describedby="modal-modal-description"
//       >
//         <Box sx={modalStyle}>
//           <Typography id="modal-modal-title" variant="h6" component="h2">
//             Select Filters
//           </Typography>
//           <Box
//             sx={{
//               marginTop: 2,
//               display: "flex",
//               flexDirection: "column",
//             }}
//           >
//             {listOfFilters.map((filter) => (
//               <div key={filter.name} style={{ marginBottom: "8px" }}>
//                 <input
//                   type="checkbox"
//                   checked={selectedFilters.includes(filter.name)}
//                   onChange={() => toggleFilter(filter.name)} // Toggle selection state
//                 />
//                 <label style={{ marginLeft: "8px" }}>{filter.label}</label>
//               </div>
//             ))}
//           </Box>
//           <Button
//             onClick={handleConfirm}
//             variant="contained"
//             sx={{ marginTop: 2, alignSelf: "flex-end" }}
//           >
//             Confirm Filter Selection
//           </Button>
//         </Box>
//       </Modal>
//     </div>
//   );
// };

// export default FilterSelectionModal;
import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import { listOfFilters } from "./FilterFunctions";
import { useFilters } from "./FilterContext";

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

const FilterSelectionModal = ({ onFilterApply }) => {
  const [open, setOpen] = useState(false);
  const { selectedFilters, addFilter, removeFilter } = useFilters();

  const handleOpen = () => setOpen(true);

  const handleClose = () => setOpen(false);

  const handleConfirm = () => {
    setOpen(false);
    onFilterApply(selectedFilters); // Apply the list of selected filters
  };

  const handleCheckboxChange = (filterName) => {
    if (selectedFilters.includes(filterName)) {
      removeFilter(filterName);
    } else {
      addFilter(filterName);
    }
  };

  return (
    <div>
      <Button onClick={handleOpen}>+</Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Select Filters
          </Typography>
          <Box
            sx={{
              marginTop: 2,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {listOfFilters.map((filter) => (
              <div key={filter.name} style={{ marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={selectedFilters.includes(filter.name)}
                  onChange={() => handleCheckboxChange(filter.name)} // Toggle selection state
                />
                <label style={{ marginLeft: "8px" }}>{filter.label}</label>
              </div>
            ))}
          </Box>
          <Button
            onClick={handleConfirm}
            variant="contained"
            sx={{ marginTop: 2, alignSelf: "flex-end" }}
          >
            Confirm Filter Selection
          </Button>
        </Box>
      </Modal>
    </div>
  );
};

export default FilterSelectionModal;

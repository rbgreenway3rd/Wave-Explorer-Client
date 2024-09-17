// import React, { useState } from "react";
// import Box from "@mui/material/Box";
// import Button from "@mui/material/Button";
// import Typography from "@mui/material/Typography";
// import Modal from "@mui/material/Modal";
// import {
//   StaticRatio_Filter,
//   DynamicRatio_Filter,
//   Div_Filter,
// } from "./FilterModels";
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
//   const { selectedFilters, addFilter, removeFilter } = useFilters();
//   const [selectedValue, setSelectedValue] = useState("staticRatio");

//   const handleOpen = () => setOpen(true);

//   const handleClose = () => setOpen(false);

//   const handleConfirm = () => {
//     setOpen(false);
//     // addFilterToList(selectedValue)
//     if (selectedValue === "staticRatio") {
//       // create instance of static ratio filter
//       new StaticRatio_Filter(
//         "Static Ratio",
//         "Static Ratio Filter Description",
//         true,
//         0,
//         5
//       );
//       // append it to filter list
//     }
//     onFilterApply(selectedFilters); // Apply the list of selected filters
//   };

//   const handleRadioCheck = (event) => {
//     setSelectedValue(event.target.value);
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
//             <div className="static-ratio">
//               <input
//                 type="radio"
//                 id="static-ratio"
//                 className="static-ratio"
//                 value="staticRatio"
//                 name="radio-group-1"
//                 checked={selectedValue === "staticRatio"}
//                 onChange={handleRadioCheck}
//               />
//               <label htmlFor="static-ratio">Static Ratio</label>
//             </div>
//             <div className="show-filtered">
//               <input
//                 type="radio"
//                 id="show-filtered"
//                 className="filtered-radio"
//                 value="showFiltered"
//                 name="radio-group-1"
//               />
//               <label htmlFor="show-filtered">Filtered</label>
//             </div>
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

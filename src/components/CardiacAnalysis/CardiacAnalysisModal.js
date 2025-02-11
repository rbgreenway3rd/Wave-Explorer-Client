// import React from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   IconButton,
//   Tooltip,
// } from "@mui/material";
// import CloseIcon from "@mui/icons-material/Close";
// import { WellSelector } from "./subComponents/WellSelection/WellSelector";
// import CardiacGraph from "./subComponents/CardiacGraph/CardiacGraph";
// import { AnalysisProvider } from "./AnalysisProvider";
// import "./styles/CardiacAnalysisModal.css";

// const CardiacAnalysisModal = ({ open, onClose }) => {
//   return (
//     <AnalysisProvider>
//       <Dialog open={open} onClose={null} fullScreen>
//         <DialogTitle>
//           Cardiac Analysis
//           <Tooltip title="Exit Cardiac Analysis" arrow>
//             <IconButton
//               aria-label="close"
//               onClick={onClose}
//               style={{ position: "absolute", right: 8, top: 8 }}
//             >
//               <CloseIcon sx={{}} />
//             </IconButton>
//           </Tooltip>
//         </DialogTitle>
//         <DialogContent>
//           {/* Modal content goes here */}
//           <div className="modal-content">
//             <WellSelector className="well-selector" />
//             <CardiacGraph className="cardiac-graph" />
//           </div>
//         </DialogContent>
//       </Dialog>
//     </AnalysisProvider>
//   );
// };

// export default CardiacAnalysisModal;

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { WellSelector } from "./subComponents/WellSelection/WellSelector";
import CardiacGraph from "./subComponents/CardiacGraph/CardiacGraph";
import { AnalysisProvider } from "./AnalysisProvider";
import ChartControls from "./subComponents/CardiacGraph/ChartControls";
import "./styles/CardiacAnalysisModal.css";

const CardiacAnalysisModal = ({ open, onClose }) => {
  const [useAdjustedBases, setUseAdjustedBases] = useState(true);
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(80);
  const [peakProminence, setPeakProminence] = useState(25000);

  return (
    <AnalysisProvider>
      <Dialog open={open} onClose={null} fullScreen>
        <DialogTitle>
          Cardiac Analysis
          <Tooltip title="Exit Cardiac Analysis" arrow>
            <IconButton
              aria-label="close"
              onClick={onClose}
              style={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon sx={{}} />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent>
          {/* Modal content goes here */}
          <div className="modal-content">
            <WellSelector className="well-selector" />
            <ChartControls
              className="chart-controls"
              useAdjustedBases={useAdjustedBases}
              setUseAdjustedBases={setUseAdjustedBases}
              findPeaksWindowWidth={findPeaksWindowWidth}
              setFindPeaksWindowWidth={setFindPeaksWindowWidth}
              peakProminence={peakProminence}
              setPeakProminence={setPeakProminence}
            />
            <CardiacGraph
              className="cardiac-graph"
              useAdjustedBases={useAdjustedBases}
              findPeaksWindowWidth={findPeaksWindowWidth}
              peakProminence={peakProminence}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AnalysisProvider>
  );
};

export default CardiacAnalysisModal;

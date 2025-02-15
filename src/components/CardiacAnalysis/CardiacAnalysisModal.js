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

import React, { useState, useContext } from "react";
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
import { AnalysisProvider, AnalysisContext } from "./AnalysisProvider";
import ChartControls from "./subComponents/CardiacGraph/ChartControls";
import "./styles/CardiacAnalysisModal.css";
import AnalysisResults from "./subComponents/AnalysisResults/AnalysisResults";

const CardiacAnalysisModal = ({ open, onClose }) => {
  const [useAdjustedBases, setUseAdjustedBases] = useState(true);
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(80);
  const [peakProminence, setPeakProminence] = useState(25000);
  const { selectedWell } = useContext(AnalysisContext);

  return (
    // <AnalysisProvider>
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
          {selectedWell ? (
            <h2>Cardiac Graph for Well {selectedWell.label}</h2>
          ) : (
            <h2>No Well Selected</h2>
          )}
          <div className="modal-body">
            <section className="controls-and-graph">
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
            </section>
            <section className="selector-and-results">
              <WellSelector className="well-selector" />
              <AnalysisResults className="analysis-results" />
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    // </AnalysisProvider>
  );
};

export default CardiacAnalysisModal;

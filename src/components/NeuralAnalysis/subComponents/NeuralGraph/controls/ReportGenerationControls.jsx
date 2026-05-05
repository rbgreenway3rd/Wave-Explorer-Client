import React, { useContext } from "react";
import { Tooltip } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { Panel, Button } from "../../../../ui";
import { DataContext } from "../../../../../providers/DataProvider";
import {
  useNeuralResults,
  useNeuralSelection,
} from "../../../NeuralProvider";
import "./NeuralControlPanel.css";

/**
 * ReportGenerationControls — two CSV-export actions:
 *   - single-well report (requires a selected well + spikes detected)
 *   - full-plate report   (requires loaded well array)
 * Each disabled state shows a helper tooltip. Reads selectedWell from
 * NeuralSelectionContext, peak count from NeuralResultsContext, and
 * wellArrays from DataContext. The two action handlers stay as props
 * because the parent owns the "open report modal" state.
 */
const ReportGenerationControls = ({
  handleGenerateReport,
  handleGenerateFullPlateReport,
}) => {
  const { selectedWell } = useNeuralSelection();
  const { pipelineResults } = useNeuralResults();
  const { wellArrays } = useContext(DataContext);
  const peakResults = pipelineResults.spikeResults;
  const isSingleWellDisabled =
    !selectedWell || !peakResults || peakResults.length === 0;
  const isFullPlateDisabled = !wellArrays || wellArrays.length === 0;

  const singleWellTooltip = isSingleWellDisabled
    ? "Select a well and run spike detection first"
    : "Generate CSV report for the currently selected well";

  const fullPlateTooltip = isFullPlateDisabled
    ? "Load a dataset with multiple wells first"
    : "Generate comprehensive CSV report for all wells in the plate";

  return (
    <Panel
      variant="dark"
      className="neural-control-panel report-generation-controls-container"
    >
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">Report Generation</h4>
      </div>

      <div className="neural-control-panel__actions">
        <Tooltip title={singleWellTooltip} arrow placement="top">
          <span>
            <Button
              variant="primary"
              block
              startIcon={<DescriptionIcon />}
              onClick={handleGenerateReport}
              disabled={isSingleWellDisabled}
              className="single-well-report-button"
            >
              Single-Well CSV
            </Button>
          </span>
        </Tooltip>

        <Tooltip title={fullPlateTooltip} arrow placement="top">
          <span>
            <Button
              variant="primary"
              block
              startIcon={<DashboardIcon />}
              onClick={handleGenerateFullPlateReport}
              disabled={isFullPlateDisabled}
              className="full-plate-report-button"
            >
              Full-Plate CSV
            </Button>
          </span>
        </Tooltip>
      </div>

      <div className="neural-control-panel__info">
        <p>
          {selectedWell && peakResults && peakResults.length > 0 ? (
            <>
              <strong>Selected Well:</strong> {selectedWell.key} (
              {peakResults.length} spikes detected)
            </>
          ) : (
            <>
              No well selected. Select a well and run spike detection to
              generate reports.
            </>
          )}
        </p>
        {wellArrays && wellArrays.length > 0 && (
          <p>
            <strong>Plate Data:</strong> {wellArrays.length} wells available for
            full-plate analysis
          </p>
        )}
      </div>
    </Panel>
  );
};

export default ReportGenerationControls;

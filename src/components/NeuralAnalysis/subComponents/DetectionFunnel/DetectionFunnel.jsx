import React, { useMemo } from "react";
import { Switch, Tooltip } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useNeuralResults, useNeuralSettings } from "../../NeuralProvider";
import {
  GATE_KEPT,
  GATE_PROMINENCE,
  GATE_ZONE,
  GATE_NOISE_FLOOR,
  GATE_KMEANS,
  GATE_WIDTH,
  GATE_SYMMETRY,
  GATE_NMS,
  GATE_MIN_DISTANCE,
  GATE_ACTIVITY,
  TIER_MARGINAL_FAIL,
} from "../../utilities/peakGeometry";
import { CANDIDATE_GATE_COLOR_BY_ID } from "../NeuralGraph/chartStyles";
import "./DetectionFunnel.css";

/**
 * DetectionFunnel — read-only diagnostic panel that surfaces the
 * candidate cascade from the pipeline's candidateDiagnostics envelope.
 *
 * Three things on screen:
 *   1. One row per gate: name, rejection count, proportional bar
 *      showing how many candidates survived through that stage, and
 *      an eye icon that toggles a single-gate highlight in the chart's
 *      candidate overlay.
 *   2. "Kept" footer row + truncation banner (when applicable).
 *   3. A "Show clear-fail rejections too" toggle that widens the
 *      candidate overlay from near-misses only to include far-failed
 *      candidates that came through gates 2-9.
 *
 * Counts are derived from the diagnostics records. Gate-1 clear-fails
 * are dropped at emission to bound payload, so the "total candidates"
 * shown here is the OBSERVABLE candidate count (records.length pre-cap)
 * — not every local maximum in the signal.
 */

// Display order matches the actual detection cascade. Gate 4 (K-Means)
// is rare (whole-well bailout) and only renders a row when it fired.
const GATE_ROWS = [
  { id: GATE_PROMINENCE, label: "Prominence" },
  { id: GATE_ZONE, label: "Zone (Outlier Shadow)" },
  { id: GATE_NOISE_FLOOR, label: "Noise Floor" },
  { id: GATE_KMEANS, label: "K-Means Bailout" },
  { id: GATE_WIDTH, label: "Width" },
  { id: GATE_SYMMETRY, label: "Symmetry" },
  { id: GATE_NMS, label: "NMS Window" },
  { id: GATE_MIN_DISTANCE, label: "Min Distance" },
  { id: GATE_ACTIVITY, label: "Activity Threshold" },
];

const GATE_DESCRIPTIONS = {
  [GATE_PROMINENCE]:
    "Candidates whose topographic prominence didn't reach the Prominence slider value.",
  [GATE_ZONE]:
    "Candidates that fell inside an identified outlier's spike shadow.",
  [GATE_NOISE_FLOOR]:
    "Candidates whose prominence was below noiseFloorMultiplier × σ.",
  [GATE_KMEANS]:
    "All candidates dropped — the well looked like pure noise (k-means circuit-breaker).",
  [GATE_WIDTH]:
    "Candidates narrower than Min Width samples.",
  [GATE_SYMMETRY]:
    "Candidates failing the prominence-symmetry ratio (asymmetric peaks).",
  [GATE_NMS]:
    "Candidates suppressed by a more prominent neighbor within the NMS window.",
  [GATE_MIN_DISTANCE]:
    "Candidates closer in time to a kept peak than Min Distance samples.",
  [GATE_ACTIVITY]:
    "Candidates whose apex Y fell below the Activity Threshold line.",
};

const DetectionFunnel = () => {
  const { pipelineResults } = useNeuralResults();
  const {
    showRejectedCandidates,
    setShowRejectedCandidates,
    candidateShowAllRejections,
    setCandidateShowAllRejections,
    candidateHighlightGate,
    setCandidateHighlightGate,
  } = useNeuralSettings();

  const diag = pipelineResults?.candidateDiagnostics;
  const records = diag?.records || [];
  const truncated = diag?.truncatedCount || 0;
  const totalObserved = diag?.totalCandidates || records.length;
  const visibilityCeiling = candidateShowAllRejections ? 3 : TIER_MARGINAL_FAIL;

  // Tally per-gate rejection count and kept count from the records
  // array. We respect the visibility ceiling here too — rows count
  // only what would be visible in the overlay given the current
  // "show clear-fail" toggle.
  const tally = useMemo(() => {
    const byGate = new Map();
    let kept = 0;
    let visibleRejections = 0;
    for (const r of records) {
      if (r.rejectedBy === GATE_KEPT) {
        kept++;
        continue;
      }
      if (r.tier > visibilityCeiling) continue;
      byGate.set(r.rejectedBy, (byGate.get(r.rejectedBy) || 0) + 1);
      visibleRejections++;
    }
    return { byGate, kept, visibleRejections };
  }, [records, visibilityCeiling]);

  // Survivors at each stage = total observed − cumulative rejections
  // up to that gate. Bar width is proportional to survivors / total.
  // K-Means appears only when it actually fired (its rejection count
  // is non-zero); otherwise its row collapses to a dimmed "—".
  const rows = useMemo(() => {
    let survivors = totalObserved;
    return GATE_ROWS.map((gate) => {
      const rejected = tally.byGate.get(gate.id) || 0;
      const survivorsBefore = survivors;
      survivors -= rejected;
      return {
        ...gate,
        rejected,
        survivorsAfter: survivors,
        survivorsBefore,
        widthPct:
          totalObserved > 0
            ? Math.max(0, Math.min(100, (survivors / totalObserved) * 100))
            : 0,
      };
    });
  }, [tally, totalObserved]);

  const handleGateHighlight = (gateId) => {
    setCandidateHighlightGate(
      candidateHighlightGate === gateId ? null : gateId
    );
  };

  const overlayDisabled = !showRejectedCandidates;

  return (
    <div className="detection-funnel">
      {!overlayDisabled && totalObserved === 0 && (
        <div className="detection-funnel__empty">
          No diagnostic candidates yet — pick a well and let the pipeline
          run.
        </div>
      )}

      {overlayDisabled && (
        <div className="detection-funnel__cta">
          <span>
            The candidate overlay is currently off. Enable it to highlight
            rejections on the chart.
          </span>
          <button
            type="button"
            className="detection-funnel__cta-btn"
            onClick={() => setShowRejectedCandidates(true)}
          >
            Show Rejected Candidates
          </button>
        </div>
      )}

      {totalObserved > 0 && (
        <>
          <div className="detection-funnel__total-row">
            <span className="detection-funnel__total-label">
              Candidates evaluated
            </span>
            <span className="detection-funnel__total-count">
              {totalObserved.toLocaleString()}
            </span>
          </div>

          <ul className="detection-funnel__rows">
            {rows.map((row) => {
              const isHighlighted = candidateHighlightGate === row.id;
              const isKmeansSkipped =
                row.id === GATE_KMEANS && row.rejected === 0;
              const gateColor = CANDIDATE_GATE_COLOR_BY_ID[row.id] || "#888";
              return (
                <li
                  key={row.id}
                  className={
                    "detection-funnel__row" +
                    (isHighlighted ? " detection-funnel__row--highlight" : "") +
                    (isKmeansSkipped ? " detection-funnel__row--idle" : "")
                  }
                >
                  <Tooltip
                    title={GATE_DESCRIPTIONS[row.id] || ""}
                    arrow
                    placement="left"
                  >
                    <span className="detection-funnel__row-label">
                      <span
                        className="detection-funnel__gate-dot"
                        style={{ background: gateColor }}
                        aria-hidden="true"
                      />
                      {row.label}
                    </span>
                  </Tooltip>
                  <span className="detection-funnel__row-bar-wrap">
                    <span
                      className="detection-funnel__row-bar"
                      style={{ width: `${row.widthPct}%` }}
                    />
                  </span>
                  <span className="detection-funnel__row-count">
                    {isKmeansSkipped ? "—" : `−${row.rejected}`}
                  </span>
                  <Tooltip
                    title={
                      isHighlighted
                        ? "Click to show all gates"
                        : isKmeansSkipped
                        ? "K-Means didn't fire on this well"
                        : "Show only this gate's rejections in the chart"
                    }
                    arrow
                    placement="left"
                  >
                    <span>
                      <button
                        type="button"
                        className="detection-funnel__highlight-btn"
                        onClick={() => handleGateHighlight(row.id)}
                        disabled={isKmeansSkipped || overlayDisabled}
                        aria-pressed={isHighlighted}
                        aria-label={`Highlight ${row.label} rejections`}
                      >
                        {isHighlighted ? (
                          <VisibilityOffOutlinedIcon fontSize="small" />
                        ) : (
                          <VisibilityOutlinedIcon fontSize="small" />
                        )}
                      </button>
                    </span>
                  </Tooltip>
                </li>
              );
            })}
          </ul>

          <div className="detection-funnel__kept-row">
            <span className="detection-funnel__kept-label">Kept</span>
            <span className="detection-funnel__kept-count">{tally.kept}</span>
          </div>

          {truncated > 0 && (
            <div className="detection-funnel__truncation">
              Showing top {records.length.toLocaleString()} of{" "}
              {(records.length + truncated).toLocaleString()} near-misses
              (sorted by detection prominence).
            </div>
          )}

          <div className="detection-funnel__footer">
            <Tooltip
              title="Widen the candidate overlay to include clear-fail rejections (far below threshold). Gate-1 clear-fails are dropped at emission to bound payload, so this only adds clear-fails from gates 2-9."
              arrow
              placement="top"
            >
              <label className="detection-funnel__footer-label">
                <Switch
                  size="small"
                  checked={!!candidateShowAllRejections}
                  onChange={(_, checked) =>
                    setCandidateShowAllRejections(checked)
                  }
                />
                <span>Include clear-fail rejections</span>
              </label>
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );
};

export default DetectionFunnel;

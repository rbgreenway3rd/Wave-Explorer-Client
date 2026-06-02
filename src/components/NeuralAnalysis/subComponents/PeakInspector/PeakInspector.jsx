import React, { useMemo } from "react";
import { Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import {
  useNeuralInspector,
  useNeuralResults,
} from "../../NeuralProvider";
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
  TIER_CLEAR_PASS,
  TIER_MARGINAL_PASS,
  TIER_MARGINAL_FAIL,
} from "../../utilities/peakGeometry";
import { CANDIDATE_GATE_COLOR_BY_ID } from "../NeuralGraph/chartStyles";
import "./PeakInspector.css";

/**
 * PeakInspector — gate-by-gate checklist for a single peak or candidate.
 *
 * Reads from:
 *   - NeuralInspectorContext.selectedCandidateIndex  (which peak)
 *   - NeuralResultsContext.pipelineResults.candidateDiagnostics  (the data)
 *
 * The pipeline re-emits diagnostics on every run, so the panel stays
 * fresh through slider drags: clicking peak X populates with X's
 * current record; dragging prominence updates X's gate results without
 * the user re-clicking. If the pipeline drops X entirely (e.g. it
 * stops being a local maximum after smoothing), the panel shows a
 * "no diagnostic record" notice.
 *
 * Layout: header (peak coords + KEPT/REJECTED badge) + table of gates
 * (name, value, threshold, margin %, pass/fail status). Rejected
 * candidates show only the gates they were evaluated against; later
 * gates render as "—" (not evaluated, honest).
 */

// Gate metadata shared with DetectionFunnel — display names + colors.
// Order matches the actual cascade order so the inspector reads
// top-to-bottom as the candidate's history.
const GATE_TABLE_ORDER = [
  { id: GATE_PROMINENCE, label: "Prominence" },
  { id: GATE_ZONE, label: "Zone" },
  { id: GATE_NOISE_FLOOR, label: "Noise Floor" },
  { id: GATE_KMEANS, label: "K-Means" },
  { id: GATE_WIDTH, label: "Width" },
  { id: GATE_SYMMETRY, label: "Symmetry" },
  { id: GATE_NMS, label: "NMS Window" },
  { id: GATE_MIN_DISTANCE, label: "Min Distance" },
  { id: GATE_ACTIVITY, label: "Activity Threshold" },
];

const TIER_LABEL = {
  [TIER_CLEAR_PASS]: "clear pass",
  [TIER_MARGINAL_PASS]: "marginal pass",
  [TIER_MARGINAL_FAIL]: "marginal fail",
  3: "clear fail",
};

// Pick a sensible numeric format for a gate's value/threshold pair. NMS
// rows render as text ("suppressed by …") and skip this helper.
const formatGateValue = (gateId, value, threshold) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  // Width and Min Distance are integer samples.
  if (gateId === GATE_WIDTH || gateId === GATE_MIN_DISTANCE) {
    return String(Math.round(value));
  }
  // Symmetry is a unitless ratio 0..1.
  if (gateId === GATE_SYMMETRY) return value.toFixed(3);
  // Prominence / noise floor / activity: decimal-aware; threshold guides
  // precision so small-Y signals stay readable.
  const scale = Math.max(Math.abs(threshold || 0), Math.abs(value));
  if (scale < 0.01) return value.toFixed(5);
  if (scale < 0.1) return value.toFixed(4);
  if (scale < 1) return value.toFixed(3);
  if (scale < 10) return value.toFixed(2);
  return value.toFixed(0);
};

const formatMargin = (gateEntry) => {
  if (!gateEntry) return "—";
  const { value, threshold } = gateEntry;
  if (
    typeof value !== "number" ||
    typeof threshold !== "number" ||
    !Number.isFinite(value) ||
    !Number.isFinite(threshold)
  ) {
    return "—";
  }
  const denom = Math.max(Math.abs(threshold), 1e-9);
  const relative = ((value - threshold) / denom) * 100;
  const sign = relative >= 0 ? "+" : "";
  if (Math.abs(relative) >= 1000) return `${sign}${relative.toFixed(0)}%`;
  return `${sign}${relative.toFixed(1)}%`;
};

const PeakInspector = () => {
  const { selectedCandidateIndex, selectCandidate } = useNeuralInspector();
  const { pipelineResults } = useNeuralResults();

  const records = pipelineResults?.candidateDiagnostics?.records;

  // Lookup the selected record. Index can become stale across pipeline
  // re-runs (a peak might disappear after smoothing changes); in that
  // case render the "stale selection" notice rather than guessing.
  const record = useMemo(() => {
    if (selectedCandidateIndex === null || !Array.isArray(records)) {
      return null;
    }
    return records.find((r) => r.index === selectedCandidateIndex) || null;
  }, [selectedCandidateIndex, records]);

  if (selectedCandidateIndex === null) {
    return (
      <div className="peak-inspector peak-inspector--empty">
        <TouchAppOutlinedIcon fontSize="medium" />
        <p>
          Click any red dot or ghost candidate on the chart to see why it
          was kept or rejected.
        </p>
        <p className="peak-inspector__empty-hint">
          Enable <strong>Rejected Candidates</strong> in the chart toggles
          to make near-miss candidates clickable too.
        </p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="peak-inspector peak-inspector--empty">
        <p>
          The peak you inspected is no longer in the latest pipeline
          result — the detection parameters likely changed.
        </p>
        <button
          type="button"
          className="peak-inspector__clear-btn"
          onClick={() => selectCandidate(null)}
        >
          Clear selection
        </button>
      </div>
    );
  }

  const isKept = record.rejectedBy === GATE_KEPT;
  const rejectionGateId = isKept ? null : record.rejectedBy;

  // Build a Map of evaluated gates for O(1) lookup as we render the
  // canonical-order table.
  const gateByIdMap = new Map();
  for (const g of record.gates || []) gateByIdMap.set(g.id, g);

  // Once a gate rejects, downstream gates were never evaluated.
  let reachedRejection = false;

  return (
    <div className="peak-inspector">
      <div className="peak-inspector__header">
        <div className="peak-inspector__header-left">
          <div className="peak-inspector__coords">
            <span>
              t = <strong>{formatTime(record.peakX)}</strong> s
            </span>
            <span>
              y = <strong>{formatY(record.peakY)}</strong>
            </span>
          </div>
          <div className="peak-inspector__sub">
            sample index {record.index}
          </div>
        </div>
        <Tooltip title="Clear selection" arrow placement="left">
          <button
            type="button"
            className="peak-inspector__close-btn"
            onClick={() => selectCandidate(null)}
            aria-label="Clear inspector selection"
          >
            <CloseIcon fontSize="small" />
          </button>
        </Tooltip>
      </div>

      <div
        className={
          "peak-inspector__badge " +
          (isKept
            ? "peak-inspector__badge--kept"
            : "peak-inspector__badge--rejected")
        }
      >
        {isKept ? "KEPT" : "REJECTED"}
        {!isKept && (
          <span className="peak-inspector__badge-gate">
            at {GATE_TABLE_ORDER.find((g) => g.id === rejectionGateId)?.label}
          </span>
        )}
        <span className="peak-inspector__badge-tier">
          ({TIER_LABEL[record.tier] || "—"})
        </span>
      </div>

      <table className="peak-inspector__table">
        <thead>
          <tr>
            <th>Gate</th>
            <th>Value</th>
            <th>Threshold</th>
            <th>Margin</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {GATE_TABLE_ORDER.map((gate) => {
            const entry = gateByIdMap.get(gate.id);
            const isRejectionRow = gate.id === rejectionGateId;
            const dimmed = reachedRejection && !isRejectionRow;
            if (entry && entry.status === "fail") {
              reachedRejection = true;
            }
            return (
              <tr
                key={gate.id}
                className={
                  (isRejectionRow ? "peak-inspector__row--fail" : "") +
                  (dimmed ? " peak-inspector__row--dimmed" : "") +
                  (entry && entry.status === "pass"
                    ? " peak-inspector__row--pass"
                    : "")
                }
              >
                <td>
                  <span
                    className="peak-inspector__gate-dot"
                    style={{
                      background: CANDIDATE_GATE_COLOR_BY_ID[gate.id] || "#666",
                    }}
                    aria-hidden="true"
                  />
                  {gate.label}
                </td>
                {gate.id === GATE_NMS && entry && entry.status === "fail" ? (
                  <td colSpan={3} className="peak-inspector__nms-cell">
                    Suppressed by peak at index{" "}
                    <button
                      type="button"
                      className="peak-inspector__suppressor-link"
                      onClick={() =>
                        selectCandidate(record.nmsSuppressor?.index)
                      }
                      disabled={!record.nmsSuppressor}
                    >
                      {record.nmsSuppressor?.index ?? "—"}
                    </button>
                    {record.nmsSuppressor?.promRatio != null && (
                      <span className="peak-inspector__nms-meta">
                        {" "}
                        ({record.nmsSuppressor.promRatio.toFixed(2)}× more
                        prominent
                        {typeof record.nmsSuppressor.overlapSamples ===
                          "number"
                          ? `, ${record.nmsSuppressor.overlapSamples}-sample overlap`
                          : ""}
                        )
                      </span>
                    )}
                  </td>
                ) : (
                  <>
                    <td>
                      {entry
                        ? formatGateValue(gate.id, entry.value, entry.threshold)
                        : "—"}
                    </td>
                    <td>
                      {entry
                        ? formatGateValue(gate.id, entry.threshold, entry.threshold)
                        : "—"}
                    </td>
                    <td>{entry ? formatMargin(entry) : "—"}</td>
                  </>
                )}
                {gate.id !== GATE_NMS && (
                  <td className="peak-inspector__status-cell">
                    {entry ? (
                      entry.status === "pass" ? (
                        <span className="peak-inspector__status peak-inspector__status--pass">
                          ✓ PASS
                        </span>
                      ) : (
                        <span className="peak-inspector__status peak-inspector__status--fail">
                          ✗ FAIL
                        </span>
                      )
                    ) : (
                      <span className="peak-inspector__status peak-inspector__status--skip">
                        —
                      </span>
                    )}
                  </td>
                )}
                {gate.id === GATE_NMS && entry && entry.status === "fail" && (
                  <td className="peak-inspector__status-cell">
                    <span className="peak-inspector__status peak-inspector__status--fail">
                      ✗ FAIL
                    </span>
                  </td>
                )}
                {gate.id === GATE_NMS && (!entry || entry.status !== "fail") && (
                  <>
                    <td>{entry ? "kept" : "—"}</td>
                    <td>—</td>
                    <td>—</td>
                    <td className="peak-inspector__status-cell">
                      {entry ? (
                        <span className="peak-inspector__status peak-inspector__status--pass">
                          ✓ PASS
                        </span>
                      ) : (
                        <span className="peak-inspector__status peak-inspector__status--skip">
                          —
                        </span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Time formatting matches the chart axis (seconds with 2 decimals up
// to ~10 s, integer above). Tight precision keeps the header compact.
const formatTime = (t) => {
  if (typeof t !== "number") return "—";
  if (Math.abs(t) < 0.01) return t.toFixed(5);
  if (Math.abs(t) < 10) return t.toFixed(3);
  if (Math.abs(t) < 100) return t.toFixed(2);
  return t.toFixed(1);
};

// Y formatting mirrors the chart's scale — handles raw counts (large
// integers) and normalized ratios (sub-unity) with one helper.
const formatY = (y) => {
  if (typeof y !== "number") return "—";
  const abs = Math.abs(y);
  if (abs < 0.01) return y.toFixed(5);
  if (abs < 1) return y.toFixed(4);
  if (abs < 100) return y.toFixed(3);
  return y.toFixed(1);
};

export default PeakInspector;

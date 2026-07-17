import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  useSelectionContainer,
  boxesIntersect,
} from "@air/react-drag-to-select";
import {
  Dialog,
  DialogContent,
  Button as MuiButton,
  Tooltip,
} from "@mui/material";
import NotInterestedIcon from "@mui/icons-material/NotInterested";
import { Button } from "../../../ui";
import { DataContext } from "../../../../providers/DataProvider";

/**
 * NeuralWellPickerModal — a dedicated well-selection dialog for the Neural
 * Analysis modal's settings (control well, control-well scaling set, F/Fo
 * exclusion set). Replaces the old "arm a mode then click the in-modal grid"
 * flow with an explicit modal that supports rubberband (drag) selection,
 * mirroring the main app's ControlSubtractionModal.
 *
 * Generic + parameterized so all three settings share one component:
 *   - multiSelect=false → single-pick (radio-like), e.g. the control well.
 *   - multiSelect=true  → toggle membership + rubberband, e.g. the control
 *                         set / F/Fo exclusion set.
 *
 * The grid is laid out by iterating `wellArrays` in order into a CSS grid
 * sized by the plate dimensions (same approach as NeuralWellSelector), so
 * selection is keyed by `well.id` and we never depend on the row/column
 * index base. Header buttons operate on display row/column position.
 */
const NeuralWellPickerModal = ({
  open,
  onClose,
  title = "Select Wells",
  multiSelect = true,
  initialSelectedIds = [],
  onConfirm,
  extraActions = [],
  accentColor = "#1976d2",
}) => {
  const { project, wellArrays } = useContext(DataContext);
  const plate = project?.plate?.[0] || {};
  const numberOfColumns = plate.numberOfColumns || 1;
  const numberOfRows = plate.numberOfRows || 1;

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Seed local selection from the caller's current selection each time the
  // modal opens (mirrors ControlSubtractionModal's reset-on-open).
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(initialSelectedIds));
    }
    // initialSelectedIds identity may change on every render; key the reset
    // on `open` only. Callers pass a fresh selection each open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const gridRef = useRef(null);
  const itemsRef = useRef([]);
  const hitIndexesRef = useRef([]);

  const toggleId = (prev, id) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const handleSelectionChange = (box) => {
    const hits = [];
    itemsRef.current.forEach((item, index) => {
      const { left, top, width, height } = item.getBoundingClientRect();
      if (boxesIntersect(box, { left, top, width, height })) {
        hits.push(index);
      }
    });
    hitIndexesRef.current = hits;
  };

  const handleSelectionEnd = () => {
    const hits = hitIndexesRef.current;
    hitIndexesRef.current = [];
    if (!hits.length) return;
    if (!multiSelect) {
      // Single-pick: a drag collapses to the last well it touched.
      const well = wellArrays[hits[hits.length - 1]];
      if (well) setSelectedIds(new Set([well.id]));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      hits.forEach((i) => {
        const well = wellArrays[i];
        if (!well) return;
        if (next.has(well.id)) next.delete(well.id);
        else next.add(well.id);
      });
      return next;
    });
  };

  const { DragSelection } = useSelectionContainer({
    onSelectionChange: handleSelectionChange,
    onSelectionEnd: handleSelectionEnd,
    isEnabled: true,
    selectionProps: {
      style: {
        border: "0.2em solid yellow",
        backgroundColor: "rgba(75, 192, 192, 0.4)",
      },
    },
    shouldStartSelecting: (target) => {
      const ok = !!gridRef.current && gridRef.current.contains(target);
      // Snapshot the cell rects at drag start — cells are guaranteed to be
      // in the DOM here (the user is pressing on one), which is more robust
      // than a mount-time effect that can race the Dialog's transition.
      if (ok) {
        itemsRef.current = Array.from(
          document.querySelectorAll(".neural-well-picker-cell")
        );
      }
      return ok;
    },
  });

  const handleCellClick = (well) => {
    if (!well) return;
    if (!multiSelect) {
      setSelectedIds(new Set([well.id]));
      return;
    }
    setSelectedIds((prev) => toggleId(prev, well.id));
  };

  // Toggle every well in a display row/column. In single-select mode header
  // buttons don't make sense, so they're hidden.
  const wellsByDisplayRow = useMemo(() => {
    const rows = [];
    wellArrays.forEach((well, index) => {
      const r = Math.floor(index / numberOfColumns);
      if (!rows[r]) rows[r] = [];
      rows[r].push(well);
    });
    return rows;
  }, [wellArrays, numberOfColumns]);

  const wellsByDisplayCol = useMemo(() => {
    const cols = [];
    wellArrays.forEach((well, index) => {
      const c = index % numberOfColumns;
      if (!cols[c]) cols[c] = [];
      cols[c].push(well);
    });
    return cols;
  }, [wellArrays, numberOfColumns]);

  const toggleGroup = (wells) => {
    setSelectedIds((prev) => {
      const allSelected = wells.every((w) => prev.has(w.id));
      const next = new Set(prev);
      wells.forEach((w) => (allSelected ? next.delete(w.id) : next.add(w.id)));
      return next;
    });
  };

  const handleClearAll = () => setSelectedIds(new Set());

  const handleConfirm = () => {
    const chosen = wellArrays.filter((w) => selectedIds.has(w.id));
    onConfirm?.(chosen);
    onClose?.();
  };

  // The modal never dismisses itself: backdrop clicks, Escape, and drag-end
  // synthetic clicks are all ignored. It closes ONLY when the user clicks
  // Cancel (discard) or Confirm (commit) — so an in-progress selection can't
  // be lost by an accidental click-away, and the setting is applied only on
  // an explicit Confirm.
  const handleDialogClose = () => {};

  const selectedCount = selectedIds.size;

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      // The modal portals to document.body, but React events still bubble
      // through the React tree to ancestor handlers (e.g. ChartControls'
      // click-outside-to-collapse). Stop click propagation here so nothing
      // the user does inside the modal can reach — and disturb — those
      // ancestors. Only `click` is stopped; mousedown is left alone so the
      // @air rubberband selection keeps working.
      onClick={(e) => e.stopPropagation()}
      sx={{
        "& .MuiDialog-paper": {
          display: "flex",
          flexDirection: "column",
          maxWidth: "90vw",
          width: "100%",
          margin: 0,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "85vh",
          overflow: "hidden",
          padding: "1em",
          boxSizing: "border-box",
        }}
      >
        <DragSelection selectableTargets={[".neural-well-picker-cell"]} />

        <h4
          style={{
            margin: 0,
            marginBottom: "0.5em",
            fontSize: "1em",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{title}</span>
          <span style={{ fontWeight: 400, fontSize: "0.85em", opacity: 0.7 }}>
            {multiSelect
              ? `${selectedCount} selected`
              : selectedCount > 0
              ? "1 selected"
              : "none selected"}
          </span>
        </h4>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            flexGrow: 1,
            overflow: "auto",
          }}
        >
          {/* Row-header column (letters). Only meaningful for multi-select. */}
          {multiSelect && (
            <div
              style={{
                display: "grid",
                gridTemplateRows: `auto repeat(${numberOfRows}, 1fr)`,
                width: "auto",
                height: "100%",
              }}
            >
              {/* Corner: select/clear all */}
              <Tooltip title="Select / clear all wells" disableInteractive>
                <MuiButton
                  onClick={() => toggleGroup(wellArrays)}
                  variant="outlined"
                  style={cornerBtnStyle}
                  tabIndex={-1}
                >
                  *
                </MuiButton>
              </Tooltip>
              {wellsByDisplayRow.map((rowWells, rowIndex) => (
                <MuiButton
                  key={`row-btn-${rowIndex}`}
                  variant="outlined"
                  style={headerBtnStyle}
                  tabIndex={-1}
                  onClick={() => toggleGroup(rowWells)}
                >
                  {String.fromCharCode(65 + rowIndex)}
                </MuiButton>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              height: "100%",
            }}
          >
            {/* Column-header row (numbers). */}
            {multiSelect && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${numberOfColumns}, 1fr)`,
                  width: "100%",
                }}
              >
                {wellsByDisplayCol.map((colWells, colIndex) => (
                  <MuiButton
                    key={`col-btn-${colIndex}`}
                    variant="outlined"
                    style={headerBtnStyle}
                    tabIndex={-1}
                    onClick={() => toggleGroup(colWells)}
                  >
                    {colIndex + 1}
                  </MuiButton>
                ))}
              </div>
            )}

            {/* The well grid. */}
            <div
              ref={gridRef}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${numberOfColumns}, 1fr)`,
                gridTemplateRows: `repeat(${numberOfRows}, 1fr)`,
                gap: 2,
                flex: 1,
                width: "100%",
              }}
            >
              {wellArrays.map((well) => {
                const isSelected = selectedIds.has(well.id);
                return (
                  <div
                    key={well.id}
                    className="neural-well-picker-cell"
                    onClick={() => handleCellClick(well)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 0,
                      minHeight: 0,
                      fontSize: "0.7em",
                      color: isSelected ? "#fff" : "#333",
                      backgroundColor: isSelected ? accentColor : "lightgrey",
                      border: "1px solid #666",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    {well.key}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>

      <div
        className="bottom-buttons"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--space-3) var(--space-4)",
          gap: "var(--space-2)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Tooltip title="Clear all well selections" disableInteractive>
            <Button
              variant="danger"
              startIcon={<NotInterestedIcon />}
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          </Tooltip>
          {extraActions.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              onClick={() => {
                const nextIds = action.onClick(Array.from(selectedIds));
                setSelectedIds(new Set(nextIds));
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

const headerBtnStyle = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  margin: 0,
  padding: 0,
  border: "1px solid black",
  borderRadius: "0.25em",
  boxSizing: "border-box",
  lineHeight: 1,
};

const cornerBtnStyle = {
  ...headerBtnStyle,
  borderTop: "2px solid black",
  borderLeft: "2px solid black",
};

export default NeuralWellPickerModal;

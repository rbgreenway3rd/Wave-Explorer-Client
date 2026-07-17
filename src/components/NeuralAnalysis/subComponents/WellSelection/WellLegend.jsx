import React from "react";
import { useNeuralSelection } from "../../NeuralProvider";

/**
 * WellLegend — a compact key for the color-coded borders the
 * NeuralWellSelector grid draws on designated wells. Rendered in the
 * "Wells" section header (CollapsibleSection `headerRight`).
 *
 * Colors mirror styles/WellSelector.css exactly:
 *   selected → yellow, control-well → cyan, control-set-well → purple,
 *   fo-excluded-well → dashed red (dimmed).
 *
 * Entries are shown only when they apply — "Selected" always (the
 * displayed well is the grid's primary interaction), and the others
 * only once at least one well of that kind is assigned — so the legend
 * describes exactly what's currently drawn on the grid.
 */
const SWATCH_BASE = {
  width: 11,
  height: 11,
  background: "#000",
  boxSizing: "border-box",
  flex: "0 0 auto",
};

const LegendItem = ({ color, label, dashed = false, dim = false }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
    <span
      style={{
        ...SWATCH_BASE,
        border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
        opacity: dim ? 0.6 : 1,
      }}
    />
    <span>{label}</span>
  </span>
);

const WellLegend = () => {
  const { selectedWell, controlWell, controlWellSet, foExcludedWellSet } =
    useNeuralSelection();

  const items = [];
  if (selectedWell)
    items.push({ key: "selected", color: "yellow", label: "Selected" });
  if (controlWell)
    items.push({ key: "control", color: "#00bcd4", label: "Control" });
  if (controlWellSet?.length)
    items.push({ key: "scaling", color: "#ab47bc", label: "Scaling" });
  if (foExcludedWellSet?.length)
    items.push({
      key: "excluded",
      color: "#e53935",
      label: "Excluded",
      dashed: true,
      dim: true,
    });

  if (items.length === 0) return null;

  return (
    // Stop propagation so clicking the legend doesn't toggle the section.
    <span
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        justifyContent: "flex-end",
        cursor: "default",
      }}
    >
      {items.map(({ key, ...rest }) => (
        <LegendItem key={key} {...rest} />
      ))}
    </span>
  );
};

export default WellLegend;

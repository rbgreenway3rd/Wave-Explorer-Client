import React from "react";
import MuiToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import MuiToggleButton from "@mui/material/ToggleButton";
import "./ToggleGroup.css";

// Project ToggleGroup. Wraps MUI ToggleButtonGroup with our sizing /
// tonal-pill styling. Pass `options` as `[{ value, label }, ...]` for
// the simple case, or compose `ToggleGroup.Item` children for richer
// content (icons + text).
//
// size: sm | md.
// `value` and `onChange` pass through to MUI (controlled-only).
export const ToggleGroup = React.forwardRef(function ToggleGroup(
  {
    value,
    onChange,
    options,
    size = "sm",
    exclusive = true,
    className = "",
    children,
    "aria-label": ariaLabel,
    ...rest
  },
  ref
) {
  const classes = [
    "ui-toggle-group",
    `ui-toggle-group--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MuiToggleButtonGroup
      ref={ref}
      value={value}
      onChange={onChange}
      exclusive={exclusive}
      className={classes}
      aria-label={ariaLabel}
      {...rest}
    >
      {options
        ? options.map((opt) => (
            <MuiToggleButton key={opt.value} value={opt.value}>
              {opt.label}
            </MuiToggleButton>
          ))
        : children}
    </MuiToggleButtonGroup>
  );
});

ToggleGroup.Item = MuiToggleButton;

export default ToggleGroup;

import React from "react";
import "./Toolbar.css";

// Horizontal (or vertical) flex strip with consistent gap and alignment.
// Use for groups of buttons / toggles / form controls.
//
// align: start | center | end | between
// orientation: horizontal | vertical
// wrap: true to allow children to wrap to a second row.
export const Toolbar = React.forwardRef(function Toolbar(
  {
    align = "start",
    orientation = "horizontal",
    wrap = false,
    className = "",
    children,
    ...rest
  },
  ref
) {
  const classes = [
    "ui-toolbar",
    `ui-toolbar--align-${align}`,
    orientation === "vertical" && "ui-toolbar--vertical",
    wrap && "ui-toolbar--wrap",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  );
});

export default Toolbar;

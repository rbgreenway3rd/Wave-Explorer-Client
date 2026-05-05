import React from "react";
import "./Panel.css";

// A vertically-stacked container for grouped controls. Replaces ad-hoc
// `<div>` wrappers with consistent padding, background, and border styling.
//
// Variants: default | recessed | elevated | accent.
// `flush` removes inner padding for tight nesting.
// `title` renders an optional header row.
export const Panel = React.forwardRef(function Panel(
  {
    variant = "default",
    flush = false,
    title,
    className = "",
    children,
    as: Component = "section",
    ...rest
  },
  ref
) {
  const classes = [
    "ui-panel",
    `ui-panel--${variant}`,
    flush && "ui-panel--flush",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component ref={ref} className={classes} {...rest}>
      {title && <h3 className="ui-panel__title">{title}</h3>}
      {children}
    </Component>
  );
});

export default Panel;

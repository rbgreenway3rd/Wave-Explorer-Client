import React from "react";
import "./Heading.css";

// Heading — semantic h1..h4 with consistent sizing from font-size tokens.
// level: 1 | 2 | 3 | 4 (defaults to 2).
// tone: default | muted.
export const Heading = React.forwardRef(function Heading(
  { level = 2, tone = "default", className = "", children, ...rest },
  ref
) {
  const Tag = `h${level}`;
  const classes = [
    "ui-heading",
    `ui-heading--${level}`,
    tone === "muted" && "ui-heading--muted",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag ref={ref} className={classes} {...rest}>
      {children}
    </Tag>
  );
});

// Text — inline or block paragraph text.
// size: xs | sm | md | lg.
// tone: default | muted.
// strong: bumps weight; align: optional center.
export const Text = React.forwardRef(function Text(
  {
    size = "md",
    tone = "default",
    strong = false,
    align,
    as: Component = "p",
    className = "",
    children,
    ...rest
  },
  ref
) {
  const classes = [
    "ui-text",
    `ui-text--${size}`,
    tone === "muted" && "ui-text--muted",
    strong && "ui-text--strong",
    align === "center" && "ui-text--center",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component ref={ref} className={classes} {...rest}>
      {children}
    </Component>
  );
});

export default Heading;

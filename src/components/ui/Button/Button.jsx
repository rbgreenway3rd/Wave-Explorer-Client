import React from "react";
import MuiButton from "@mui/material/Button";
import "./Button.css";

// Project Button. Wraps MUI Button so a11y / ref forwarding / disabled
// handling come for free, but applies our own className-driven styling.
//
// Variants: primary (default, gradient), secondary (outlined), ghost
// (text), danger.
// Sizes: sm | md | lg.
// `block` makes the button full-width.
//
// All other props (onClick, type, disabled, children, startIcon, endIcon,
// ...) pass through to MUI Button untouched.
export const Button = React.forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    block = false,
    className = "",
    children,
    ...rest
  },
  ref
) {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    block && "ui-button--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MuiButton ref={ref} className={classes} disableRipple {...rest}>
      {children}
    </MuiButton>
  );
});

export default Button;

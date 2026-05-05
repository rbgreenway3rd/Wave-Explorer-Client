import React from "react";
import MuiIconButton from "@mui/material/IconButton";
import "./IconButton.css";

// Project IconButton with consistent sizing and hover treatment.
// Variants: default | subtle | accent.
// Sizes: sm | md | lg.
export const IconButton = React.forwardRef(function IconButton(
  {
    variant = "default",
    size = "md",
    className = "",
    children,
    ...rest
  },
  ref
) {
  const classes = [
    "ui-icon-button",
    `ui-icon-button--${variant}`,
    `ui-icon-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MuiIconButton ref={ref} className={classes} disableRipple {...rest}>
      {children}
    </MuiIconButton>
  );
});

export default IconButton;

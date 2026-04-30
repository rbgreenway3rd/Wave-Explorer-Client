import React from "react";
import "./FormRow.css";

// FormRow — a labeled form control. Replaces the old global
// MuiFormControlLabel hack with explicit, opt-in label placement.
//
// orientation: inline | stacked.
// Pass label as text or any node; control is the children.
// Optional hint renders as small muted text below the label.
export const FormRow = React.forwardRef(function FormRow(
  {
    orientation = "inline",
    label,
    hint,
    htmlFor,
    className = "",
    children,
    ...rest
  },
  ref
) {
  const classes = [
    "ui-form-row",
    `ui-form-row--${orientation}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes} {...rest}>
      {label && (
        <label className="ui-form-row__label" htmlFor={htmlFor}>
          {label}
          {hint && (
            <span className="ui-form-row__hint" style={{ marginLeft: 6 }}>
              {hint}
            </span>
          )}
        </label>
      )}
      <div className="ui-form-row__control">{children}</div>
    </div>
  );
});

export default FormRow;

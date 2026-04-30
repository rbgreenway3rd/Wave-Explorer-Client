import React from "react";
import MuiDialog from "@mui/material/Dialog";
import "./Modal.css";

// Composed Modal — wraps MUI Dialog and exposes a header/body/footer
// shell as `Modal.Header`, `Modal.Body`, `Modal.Footer` for consistent
// padding, dividers, and typography.
//
// Usage:
//   <Modal open={open} onClose={onClose}>
//     <Modal.Header>Title</Modal.Header>
//     <Modal.Body>...</Modal.Body>
//     <Modal.Footer>
//       <Button variant="ghost" onClick={onClose}>Cancel</Button>
//       <Button onClick={onSave}>Save</Button>
//     </Modal.Footer>
//   </Modal>
function ModalRoot({
  open,
  onClose,
  className = "",
  maxWidth = "sm",
  fullWidth = false,
  children,
  ...rest
}) {
  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      className={`ui-modal ${className}`.trim()}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      {...rest}
    >
      {children}
    </MuiDialog>
  );
}

function Header({ className = "", children, ...rest }) {
  return (
    <div className={`ui-modal__header ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function Body({ className = "", children, ...rest }) {
  return (
    <div className={`ui-modal__body ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function Footer({ className = "", children, ...rest }) {
  return (
    <div className={`ui-modal__footer ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export const Modal = Object.assign(ModalRoot, { Header, Body, Footer });
export default Modal;

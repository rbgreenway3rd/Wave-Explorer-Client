import React, { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Modal, Button } from "../ui";
import { supabase } from "../../supabaseClient";
import "../../styles/NavBar.css";

export default function ProfileMenu({ profile, setProfile }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mustChange, setMustChange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch must_change_password flag from profile (if available)
  useEffect(() => {
    if (profile && profile.must_change_password) {
      setMustChange(true);
      setShowChangePw(true);
    }
  }, [profile]);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleOpenChangePw = () => {
    setShowChangePw(true);
    setAnchorEl(null);
  };
  const handleCloseChangePw = () => {
    if (!mustChange) setShowChangePw(false);
    setError("");
    setSuccess("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: pwError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (pwError) {
        setError(pwError.message);
      } else {
        setSuccess("Password changed successfully.");
        if (mustChange && profile?.id) {
          await supabase
            .from("profiles")
            .update({ must_change_password: false })
            .eq("id", profile.id)
            .select()
            .single();
          setMustChange(false);
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .select("permissions, username, email, must_change_password, id")
            .eq("id", profile.id)
            .single();
          if (updatedProfile && setProfile) {
            setProfile(updatedProfile);
          }
        }
        setTimeout(() => {
          handleCloseChangePw();
        }, 1200);
      }
    } catch (err) {
      setError("Failed to change password.");
    }
    setLoading(false);
  };

  const visibilityAdornment = (visible, toggle, label) => ({
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          aria-label={`toggle ${label} visibility`}
          onClick={() => toggle((v) => !v)}
          edge="end"
          size="small"
        >
          {visible ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ),
  });

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleMenuOpen}
        size="large"
        aria-label="profile menu"
        className="nav-pill-button nav-pill-button--circle profile-menu__trigger"
      >
        <AccountCircleOutlinedIcon className="profile-menu__icon" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleMenuClose} disabled>
          <ListItemText primary="My Permissions" />
        </MenuItem>
        <MenuItem onClick={handleOpenChangePw}>
          <ListItemText primary="Change Password" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <span className="profile-menu__signout">Sign Out</span>
          </ListItemIcon>
        </MenuItem>
      </Menu>

      <Modal
        open={showChangePw}
        onClose={mustChange ? undefined : handleCloseChangePw}
        maxWidth="xs"
        fullWidth
      >
        <Modal.Header>Change Password</Modal.Header>
        <Modal.Body>
          {mustChange && (
            <Alert severity="warning" className="profile-menu__must-change">
              You must change your password before continuing.
            </Alert>
          )}
          <form onSubmit={handleChangePassword} className="profile-menu__form">
            <TextField
              label="Current Password"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="current-password"
              required={!!profile?.must_change_password}
              InputProps={visibilityAdornment(
                showCurrent,
                setShowCurrent,
                "current password"
              )}
            />
            <TextField
              label="New Password"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="new-password"
              InputProps={visibilityAdornment(
                showNew,
                setShowNew,
                "new password"
              )}
            />
            <TextField
              label="Confirm New Password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="new-password"
              InputProps={visibilityAdornment(
                showConfirm,
                setShowConfirm,
                "confirm password"
              )}
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </form>
        </Modal.Body>
        <Modal.Footer>
          {!mustChange && (
            <Button variant="ghost" onClick={handleCloseChangePw}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleChangePassword}
            disabled={loading}
          >
            Change Password
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

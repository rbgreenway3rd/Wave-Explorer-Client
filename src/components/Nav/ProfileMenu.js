import React, { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { supabase } from "../../supabaseClient";

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

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

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
      // No re-authentication: Supabase updates password for current user
      const { error: pwError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (pwError) {
        setError(pwError.message);
      } else {
        setSuccess("Password changed successfully.");
        // If must_change_password, update in DB
        if (mustChange && profile?.id) {
          await supabase
            .from("profiles")
            .update({ must_change_password: false })
            .eq("id", profile.id)
            .select()
            .single();
          setMustChange(false);
          // Refetch profile to update parent state
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

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleMenuOpen}
        size="large"
        aria-label="profile menu"
        sx={{ ml: 3 }}
        style={{
          border: "solid rgb(140, 140, 140) 1px",
          borderRadius: "50%",
          backgroundImage:
            "radial-gradient(rgb(240, 240, 240), rgb(230, 230, 230), rgb(220, 220, 230), rgb(210, 210, 220), rgb(200, 200, 210), rgb(180, 180, 190), rgb(160, 160, 170), rgb(140, 140, 150))",
        }}
      >
        <AccountCircleOutlinedIcon
          sx={{ fontSize: "1.1em", borderRadius: "50%" }}
        />
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
            <span style={{ fontWeight: 600 }}>Sign Out</span>
          </ListItemIcon>
        </MenuItem>
      </Menu>

      <Dialog
        open={showChangePw}
        onClose={mustChange ? undefined : handleCloseChangePw}
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {mustChange && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You must change your password before continuing.
            </Alert>
          )}
          <form onSubmit={handleChangePassword}>
            <TextField
              label="Current Password"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="current-password"
              required={!!profile?.must_change_password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle current password visibility"
                      onClick={() => setShowCurrent((show) => !show)}
                      edge="end"
                      size="small"
                    >
                      {showCurrent ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="New Password"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle new password visibility"
                      onClick={() => setShowNew((show) => !show)}
                      edge="end"
                      size="small"
                    >
                      {showNew ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirm New Password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirm((show) => !show)}
                      edge="end"
                      size="small"
                    >
                      {showConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <DialogActions>
              {!mustChange && (
                <Button onClick={handleCloseChangePw} color="secondary">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                Change Password
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

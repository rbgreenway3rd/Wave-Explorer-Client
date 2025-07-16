import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import {
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestUsername, setRequestUsername] = useState("");
  const [requestStatus, setRequestStatus] = useState("");

  // Helper to get email by username
  const getEmailByUsername = async (username) => {
    const cleanUsername = username.trim();
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .ilike("username", cleanUsername)
      .single();
    if (error) throw new Error("Username not found");
    return data.email;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const emailFromDb = await getEmailByUsername(username);
      const { error: loginError, user } =
        await supabase.auth.signInWithPassword({
          email: emailFromDb,
          password,
        });
      if (loginError) setError(loginError.message);
      else if (onLogin) onLogin(user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Handle access request form submission
  const handleRequestAccess = async (e) => {
    e.preventDefault();
    setRequestStatus("");
    if (!requestEmail || !requestUsername) {
      setRequestStatus("Email and username are required.");
      return;
    }
    // Store request in a table (e.g., user_requests)
    const { error } = await supabase
      .from("user_requests")
      .insert([{ email: requestEmail, username: requestUsername }]);
    if (error)
      setRequestStatus("Failed to submit request. Please try again later.");
    else
      setRequestStatus(
        "Request submitted! You will be contacted by an administrator."
      );
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      mt={8}
      sx={{ backgroundColor: "white" }}
    >
      <Typography variant="h5" mb={2}>
        Sign In
      </Typography>
      <form style={{ width: "300px" }}>
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          margin="normal"
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Box mt={2} display="flex" justifyContent="space-between">
          <Button
            variant="contained"
            color="primary"
            onClick={handleLogin}
            disabled={loading}
          >
            Login
          </Button>
          <Button
            variant="text"
            onClick={() => setShowRequestDialog(true)}
            disabled={loading}
          >
            Need an account? Request Access
          </Button>
        </Box>
      </form>
      <Dialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
      >
        <DialogTitle>Request Access</DialogTitle>
        <DialogContent>
          <form onSubmit={handleRequestAccess}>
            <TextField
              label="Email"
              type="email"
              value={requestEmail}
              onChange={(e) => setRequestEmail(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Desired Username"
              value={requestUsername}
              onChange={(e) => setRequestUsername(e.target.value)}
              fullWidth
              margin="normal"
            />
            {requestStatus && (
              <Alert
                severity={
                  requestStatus.startsWith("Request submitted")
                    ? "success"
                    : "error"
                }
              >
                {requestStatus}
              </Alert>
            )}
            <DialogActions>
              <Button onClick={() => setShowRequestDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Submit
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

import React, { useState } from "react";
import { auth, db } from "../../firebaseClient";
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
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";

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
    const q = query(
      collection(db, "profiles"),
      where("username", "==", username.trim())
    );
    const snapshot = await getDocs(q);
    // console.log(
    //   "Profiles query result:",
    //   snapshot.docs.map((doc) => doc.data())
    // );
    if (snapshot.empty) throw new Error("Username not found");
    return snapshot.docs[0].data().email;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const emailFromDb = await getEmailByUsername(username);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        emailFromDb,
        password
      );
      if (onLogin) onLogin(userCredential.user);
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
    try {
      await addDoc(collection(db, "user_requests"), {
        email: requestEmail,
        username: requestUsername,
      });
      setRequestStatus(
        "Request submitted! You will be contacted by an administrator."
      );
    } catch (error) {
      setRequestStatus("Failed to submit request. Please try again later.");
    }
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

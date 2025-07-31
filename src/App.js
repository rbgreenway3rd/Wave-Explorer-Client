import React, { useContext, useEffect, useState } from "react";
import "./App.css";
import { NavBar } from "./components/Nav/NavBar";
import { CombinedComponent } from "./components/CombinedComponent";
import { DataProvider } from "./providers/DataProvider";
import { NoDataUploaded } from "./components/NoDataUploaded";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./providers/StyleProvider";
import Login from "./components/Auth/Login";
import { supabase } from "./supabaseClient";
import { PERMISSIONS } from "./permissions";
import { db } from "./firebaseClient";
import { collection, getDocs, query, where } from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  // When the user logs in, fetch their profile from Firestore
  const handleLogin = async (firebaseUser) => {
    setUser(firebaseUser);
    setLoading(true);
    // Query Firestore for profile by email
    try {
      const q = query(
        collection(db, "profiles"),
        where("email", "==", firebaseUser.email)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setProfile({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setProfile(null);
      }
    } catch (err) {
      setProfile(null);
    }
    setLoading(false);
  };

  // Show loading spinner if loading
  if (loading) return null; // You can replace with a spinner component

  // If not logged in, show Login page
  if (!user || !profile) {
    return <Login onLogin={handleLogin} />;
  }

  // If logged in and profile loaded, show main app
  return (
    <>
      {/* <FilterProvider> */}
      <DataProvider>
        {/* <NavBar /> */}
        <ThemeProvider theme={theme}>
          <CombinedComponent profile={profile} setProfile={setProfile} />
        </ThemeProvider>
      </DataProvider>
      {/* </FilterProvider> */}
    </>
  );
}

export default App;

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

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = window.location;

  useEffect(() => {
    // Handle email confirmation link
    const params = new URLSearchParams(location.search);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        window.location.replace("/"); // Clean up URL
      });
    }
    // Check initial auth state
    const session = supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("permissions, username, email, must_change_password, id")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [user]);

  if (loading) return null; // or a loading spinner

  if (!user) {
    return (
      <Login
        onLogin={() => {
          supabase.auth
            .getSession()
            .then(({ data: { session } }) => setUser(session?.user ?? null));
        }}
      />
    );
  }

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

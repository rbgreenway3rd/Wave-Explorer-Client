import React from "react";
import "./App.css";
import { NavBar } from "./components/Nav/NavBar";
import { CombinedComponent } from "./components/CombinedComponent";

import { DataProvider } from "./components/FileHandling/DataProvider";
function App() {
  return (
    <>
      <NavBar />
      <DataProvider>
        <CombinedComponent />
      </DataProvider>
    </>
  );
}

export default App;

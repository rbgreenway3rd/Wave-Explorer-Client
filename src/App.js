import React from "react";
import "./App.css";
import { NavBar } from "./components/Nav/NavBar";
import { CombinedComponent } from "./components/CombinedComponent";
import { CombinedComponentTest } from "./components/CombinedComponentTest";
import { DataProvider } from "./components/FileHandling/DataProvider";
function App() {
  return (
    <>
      <NavBar />
      <DataProvider>
        <CombinedComponentTest />
      </DataProvider>
    </>
  );
}

export default App;

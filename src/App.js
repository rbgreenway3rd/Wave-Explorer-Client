import React from "react";
import "./App.css";
import { NavBar } from "./components/Nav/NavBar";
import { CombinedComponent } from "./components/CombinedComponent";
import { FilterProvider } from "./components/Graphing/FilteredData/FilterContext";
import { DataProvider } from "./components/FileHandling/DataProvider";

function App() {
  return (
    <>
      <NavBar />
      {/* <FilterProvider> */}
      <DataProvider>
        <CombinedComponent />
      </DataProvider>
      {/* </FilterProvider> */}
    </>
  );
}

export default App;

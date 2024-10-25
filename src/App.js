import React, { useContext } from "react";
import "./App.css";
import { NavBar } from "./components/Nav/NavBar";
import { CombinedComponent } from "./components/CombinedComponent";
import { DataProvider } from "./providers/DataProvider";
import { NoDataUploaded } from "./components/NoDataUploaded";
// import { DataContext } from "./components/FileHandling/DataProvider";

function App() {
  return (
    <>
      {/* <FilterProvider> */}
      <DataProvider>
        {/* <NavBar /> */}

        <CombinedComponent />
      </DataProvider>
      {/* </FilterProvider> */}
    </>
  );
}

export default App;

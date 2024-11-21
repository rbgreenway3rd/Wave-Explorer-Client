import React, { useContext } from "react";
import "./App.css";
import { NavBar } from "./components/Nav/NavBar";
import { CombinedComponent } from "./components/CombinedComponent";
import { DataProvider } from "./providers/DataProvider";
import { NoDataUploaded } from "./components/NoDataUploaded";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./providers/StyleProvider";

function App() {
  return (
    <>
      {/* <FilterProvider> */}
      <DataProvider>
        {/* <NavBar /> */}
        <ThemeProvider theme={theme}>
          {/* <NavBar /> */}
          <CombinedComponent />
        </ThemeProvider>
      </DataProvider>
      {/* </FilterProvider> */}
    </>
  );
}

export default App;

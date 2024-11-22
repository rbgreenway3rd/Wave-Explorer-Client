import { createTheme } from "@mui/material/styles";
import { borderRadius } from "@mui/system";
import { color } from "chart.js/helpers";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2", // Customize your primary color
    },
    secondary: {
      main: "#dc004e", // Customize your secondary color
    },
    LightGrey: {
      main: "rgb(211,211,211)",
    },
    MidGrey: {
      main: "rgb(180,180,180)",
    },
  },
  typography: {
    // fontFamily: "Roboto, Arial, sans-serif", // Customize the font
  },
  components: {
    // You can also globally customize components like buttons, etc.
    MuiButton: {
      styleOverrides: {
        root: {
          //   borderRadius: "8px", // Rounded buttons
          padding: 0,
          //   margin: 0,
          lineHeight: 1.25,
          letterSpacing: 0,
          borderRadius: 0,
          boxShadow: "none",
        },
        contained: {
          // backgroundColor: "#1976d2", // Primary color for contained button
          color: "#fff", // White text for contained button
          "&:hover": {
            backgroundColor: "#1565c0", // Darker shade for hover
          },
          fontSize: "0.65rem",
          justifyContent: "center",
          backgroundImage:
            "linear-gradient(-180deg, rgb(96, 127, 190) 0%, rgb(0,32,96) 100%)",
          boxShadow: "none",
        },
        outlined: {
          borderColor: "#1976d2", // Primary color for outlined button border
          backgroundColor: "#B4B4B4",
          color: "#1976d2", // Text color for outlined button
          "&:hover": {
            backgroundColor: "#e3f2fd", // Light background on hover
            borderColor: "#1565c0", // Darker border on hover
          },
          fontSize: "0.75rem",
          textAlign: "center",
          alignContent: "center",
          minWidth: "none",
        },
        text: {
          color: "#1976d2", // Primary text color for text button
          "&:hover": {
            backgroundColor: "rgba(25, 118, 210, 0.08)", // Light background on hover
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontSize: "inherit",
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: 0,
          "& .MuiSvgIcon-root": {},
          "&.Mui-checked .MuiSvgIcon-root": {
            color: "black",
          },
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: { padding: 0 },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          // border: "solid 1px black",
          backgroundColor: "rgb(160,160,160)",
          width: "100%",
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          padding: 0,
          margin: 0,
          fontSize: "0.7em",
          // borderBottom: "1px solid #eee",
          backgroundColor: "rgb(180,180,180)",
          // border: "solid 1px black",
          // border: "solid 1px rgb(160,160,160)",
          borderTop: "none",
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.85em",
          backgroundColor: "rgb(160,160,160)",
          width: "100%",
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        // root: { padding: 0 },
        // outlined: { padding: 0 },
      },
    },
    MuiFormGroup: {
      styleOverrides: {
        root: { display: "flex", flexDirection: "column" },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #eee",

          backgroundColor: "rgb(180,180,180)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 0,
        },
      },
    },
  },
});
export default theme;

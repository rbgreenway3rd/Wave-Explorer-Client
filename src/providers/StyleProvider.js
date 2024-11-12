import { createTheme } from "@mui/material/styles";

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
        },
        contained: {
          backgroundColor: "#1976d2", // Primary color for contained button
          color: "#fff", // White text for contained button
          "&:hover": {
            backgroundColor: "#1565c0", // Darker shade for hover
          },
          fontSize: "0.75rem",
        },
        outlined: {
          borderColor: "#1976d2", // Primary color for outlined button border
          backgroundColor: "#B4B4B4",
          color: "#1976d2", // Text color for outlined button
          "&:hover": {
            backgroundColor: "#e3f2fd", // Light background on hover
            borderColor: "#1565c0", // Darker border on hover
          },
        },
        text: {
          color: "#1976d2", // Primary text color for text button
          "&:hover": {
            backgroundColor: "rgba(25, 118, 210, 0.08)", // Light background on hover
          },
        },
        // // Custom variant
        // primary: {
        //   backgroundColor: "#f50057",
        //   color: "#fff",
        //   fontWeight: "bold",
        //   //   textTransform: "uppercase", // Uppercase text
        //   padding: "8px 20px",
        //   borderRadius: "12px",
        //   "&:hover": {
        //     backgroundColor: "#c51162", // Darker background color on hover
        //   },
        // },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: { padding: 0 },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: { padding: 0 },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: { padding: 0, margin: 0 },
      },
    },
    // MuiInputLabel: {
    //   variants: [
    //     {
    //       props: { variant: "headerVariant" },
    //       style: {
    //         // padding: 0,
    //       },
    //     },
    //   ],
    // },
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
  },
});
export default theme;

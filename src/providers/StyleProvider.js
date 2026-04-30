// MUI theme — preserves the original dense-control look the existing
// (unmigrated) screens depend on, but routes color values through the
// design-token mirror in tokens.js. Component CSS in plain `.css` files
// reads tokens.css directly via var(--token-*); this file exists only so
// MUI's createTheme has JS-readable values at module-init time.
//
// Migration plan: each follow-up phase migrates a screen onto the
// primitive library in components/ui/ (which uses higher-specificity
// classes and ignores most of these overrides). Once a screen is fully
// migrated, the corresponding global override here can be retired.
//
// Until then, KEEPING THIS THEME DENSE is what stops the legacy controls
// from suddenly growing and breaking the four-quadrant layout.

import { createTheme } from "@mui/material/styles";
import {
  colors,
  semanticColors,
  fontSize,
} from "../styles/tokens.js";

export const theme = createTheme({
  palette: {
    primary:   { main: semanticColors.primary },
    secondary: { main: "#dc004e" },
    LightGrey: { main: "rgb(211, 211, 211)" },
    MidGrey:   { main: colors.gray300 },
    error:     { main: semanticColors.danger },
  },
  typography: {
    // Inherit the body font from index.css; intentionally not setting
    // fontFamily here so MUI doesn't fight tokens.css.
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: 0,
          lineHeight: 1.25,
          letterSpacing: 0,
          borderRadius: 0,
          boxShadow: "none",
        },
        contained: {
          color: semanticColors.textOnAccent,
          fontSize: fontSize.xs,
          justifyContent: "center",
          backgroundImage: semanticColors.accentGradient,
          boxShadow: "none",
          "&:hover": {
            backgroundColor: semanticColors.primaryHover,
          },
        },
        outlined: {
          display: "flex",
          borderColor: semanticColors.primary,
          backgroundColor: colors.gray400,
          color: semanticColors.primary,
          fontSize: fontSize.xs,
          textAlign: "center",
          alignContent: "center",
          alignItems: "center",
          alignSelf: "center",
          minWidth: "none",
          "&:hover": {
            backgroundColor: semanticColors.primarySoft,
            borderColor: semanticColors.primaryHover,
          },
        },
        text: {
          color: semanticColors.primary,
          "&:hover": {
            backgroundColor: "rgba(25, 118, 210, 0.08)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { padding: 0 },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          display: "flex",
          fontSize: "inherit",
          alignContent: "center",
          alignItems: "center",
          alignSelf: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 0,
          margin: 0,
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: 0,
          "&.Mui-checked .MuiSvgIcon-root": {
            color: semanticColors.primaryDeep,
            backgroundImage:
              "radial-gradient(rgb(96, 127, 190, 0.25) 0%, rgb(48, 79.5, 143, 0.15) 50%, rgb(0, 32, 96, 0.05) 70%)",
            borderRadius: "50%",
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 0,
          "&.Mui-checked": { color: "rgb(0, 32, 96, 0.85)" },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: { width: "100%" },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          padding: 0,
          margin: 0,
          fontSize: "0.6em",
          borderBottom: `1px solid ${colors.gray300}`,
          backgroundColor: "rgb(180, 180, 180, 0.7)",
          borderTop: "none",
          textTransform: "uppercase",
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: fontSize.md,
          width: "100%",
        },
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
          borderBottom: `1px solid ${colors.gray100}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 0,
        },
      },
    },
    MuiBox: {
      styleOverrides: {
        root: { width: "auto" },
      },
    },
  },
});

export default theme;

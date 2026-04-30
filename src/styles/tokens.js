// JS mirror of the design tokens defined in tokens.css.
//
// Why mirror? MUI's createTheme runs at module-init time, before any DOM
// exists, so it can't read CSS custom properties. Components that style
// themselves through MUI's theme (Buttons, Checkboxes, Radios) need
// JS-readable color values. Anything that styles itself through plain CSS
// reads var(--token-name) directly from tokens.css and does NOT use this
// file.
//
// Keep these values in sync with tokens.css. If they drift, MUI components
// will look subtly different from primitive components — easy to spot
// visually and easy to fix here.

export const colors = {
  blue50:  "#e3f2fd",
  blue300: "rgb(96, 127, 190)",
  blue500: "#1976d2",
  blue700: "#1565c0",
  blue900: "rgb(0, 32, 96)",

  gray50:  "#f1f1f1",
  gray100: "#e0e0e0",
  gray200: "rgb(210, 210, 210)",
  gray300: "rgb(180, 180, 180)",
  gray400: "#b4b4b4",
  gray500: "rgb(100, 100, 100)",
  gray700: "#555",
  gray900: "#282c34",

  red400: "#f44336",
  red500: "#d32f2f",
  red50:  "#ffebee",

  orange300: "#ffb74d",
  orange500: "#ff9800",
  orange700: "#f57c00",
  orange50:  "#fff3e0",

  green300: "#81c784",
  green500: "#4caf50",
  green700: "#388e3c",
  green50:  "#e8f5e9",

  cyan300: "#4dd0e1",
  cyan500: "#00bcd4",
  cyan700: "#0097a7",
  cyan50:  "#e0f7fa",

  // Neural-module dark surfaces (kept dark by design for spike-viz contrast)
  neuralBg:           "#1e1e1e",
  neuralBgLight:      "#424242",
  neuralBgDark:       "#141414",
  neuralBgPaper:      "#252525",
  neuralBgPaperElev:  "#2d2d2d",
  neuralText:         "#fff",
  neuralTextSecondary: "#aaa",
  neuralTextDisabled:  "#888",
  neuralBorder:       "#555",
  neuralBorderLight:  "#888",
  neuralDivider:      "#444",
  neuralDisabled:     "#ccc",
};

export const semanticColors = {
  primary:       colors.blue500,
  primaryHover:  colors.blue700,
  primaryDeep:   colors.blue900,
  primarySoft:   colors.blue50,
  accentGradient:
    `linear-gradient(-180deg, ${colors.blue300} 0%, ${colors.blue900} 100%)`,

  text:          colors.gray900,
  textMuted:     colors.gray500,
  textOnAccent:  "#fff",

  bgCanvas:      "#fff",
  bgPanel:       colors.gray200,
  bgControl:     colors.gray300,
  bgRecessed:    colors.gray100,

  border:        colors.gray400,
  borderStrong:  colors.gray500,

  danger:        colors.red500,
  dangerBright:  colors.red400,
  dangerSoft:    colors.red50,

  warning:       colors.orange500,
  warningDark:   colors.orange700,
  warningSoft:   colors.orange50,

  success:       colors.green500,
  successDark:   colors.green700,
  successSoft:   colors.green50,

  info:          colors.cyan500,
  infoDark:      colors.cyan700,
  infoSoft:      colors.cyan50,
};

export const fontSize = {
  xs: "0.65rem",
  sm: "0.75rem",
  md: "0.85rem",
  lg: "1rem",
  xl: "1.25rem",
};

export const radius = {
  sm: "2px",
  md: "4px",
  lg: "8px",
};

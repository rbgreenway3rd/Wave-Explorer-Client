/**
 * controlsTheme.js
 *
 * Design system for Neural Analysis control components. The shape of the
 * exported `controlsTheme` object is preserved (~10 control jsx files
 * reference it directly), but values now flow through the app-wide
 * design tokens in `frontend/src/styles/tokens.js` so there is one source
 * of truth.
 *
 * Categories:
 *   - colors:        primary/secondary/status/text/background — all routed
 *                    through token mirrors. Dark surfaces use the
 *                    Neural-scoped --color-neural-* tokens.
 *   - spacing:       a tight 0/2/4/8/12/18 px scale, intentionally
 *                    different from the app's 4-base scale because the
 *                    Neural controls are dense scientific UI.
 *   - typography:    pixel-based scale, Neural-scoped for the same reason.
 *   - borderRadius:  mostly 0 (square panels) with a single rounded
 *                    variant. Neural-scoped.
 *   - shadows:       Material-ish elevation set, Neural-scoped.
 *   - transitions:   routes timing through tokens where applicable.
 */

import { colors as appColors, semanticColors } from "../../../../../styles/tokens.js";

export const controlsTheme = {
  colors: {
    // Primary — matches the app's primary blue palette.
    primary:      "#2196f3",         // brighter than --color-primary; specific to controls
    primaryLight: "#64b5f6",
    primaryDark:  semanticColors.primary,    // = #1976d2 (app primary)
    primaryBg:    semanticColors.primarySoft, // = #e3f2fd

    // Secondary — Material cyan, now routed through the app's info palette.
    secondary:     semanticColors.info,      // #00bcd4
    secondaryLight: appColors.cyan300,
    secondaryDark: semanticColors.infoDark,  // #0097a7
    secondaryBg:   semanticColors.infoSoft,  // #e0f7fa

    // Success — Material green, app status palette.
    success:      semanticColors.success,
    successLight: appColors.green300,
    successDark:  semanticColors.successDark,
    successBg:    semanticColors.successSoft,

    // Warning — Material orange, app status palette.
    warning:      semanticColors.warning,
    warningLight: appColors.orange300,
    warningDark:  semanticColors.warningDark,
    warningBg:    semanticColors.warningSoft,

    // Danger — bright Material red; app's --color-danger is the deeper
    // shade used for FilterControls etc., so Neural controls take the
    // brighter variant for clearer destructive cues.
    danger:      semanticColors.dangerBright,
    dangerLight: "#e57373",
    dangerDark:  semanticColors.danger,      // app --color-danger
    dangerBg:    semanticColors.dangerSoft,

    // Neutrals + text + background — Neural-scoped dark surfaces.
    disabled:     appColors.neuralDisabled,
    disabledText: "#666",
    border:       appColors.neuralBorder,
    borderLight:  appColors.neuralBorderLight,
    divider:      appColors.neuralDivider,

    text:          appColors.neuralText,
    textSecondary: appColors.neuralTextSecondary,
    textDisabled:  appColors.neuralTextDisabled,

    background:      appColors.neuralBg,
    backgroundLight: appColors.neuralBgLight,
    backgroundDark:  appColors.neuralBgDark,
    paper:           appColors.neuralBgPaper,
    paperElevated:   appColors.neuralBgPaperElev,

    // ROI accent set — semantic colors per ROI index. Distinct values
    // chosen for visual separability; not currently in the app token
    // palette since they're only used here.
    roi: [
      { bg: "rgba(0, 255, 0, 0.15)",   border: "rgba(0, 255, 0, 0.7)",   name: "Green" },
      { bg: "rgba(0, 0, 255, 0.12)",   border: "rgba(0, 0, 255, 0.7)",   name: "Blue" },
      { bg: "rgba(255, 0, 0, 0.12)",   border: "rgba(255, 0, 0, 0.7)",   name: "Red" },
      { bg: "rgba(255, 165, 0, 0.13)", border: "rgba(255, 165, 0, 0.7)", name: "Orange" },
      { bg: "rgba(128, 0, 128, 0.13)", border: "rgba(128, 0, 128, 0.7)", name: "Purple" },
      { bg: "rgba(0, 206, 209, 0.13)", border: "rgba(0, 206, 209, 0.7)", name: "Cyan" },
      { bg: "rgba(255, 192, 203, 0.13)", border: "rgba(255, 192, 203, 0.7)", name: "Pink" },
      { bg: "rgba(255, 255, 0, 0.13)", border: "rgba(255, 255, 0, 0.7)", name: "Yellow" },
    ],
  },

  // Spacing system (tight px grid; Neural-scoped). The app's --space-*
  // scale is 4-base; Neural panels need 2px increments for compact
  // controls.
  spacing: {
    xs: 0,
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
    xxl: 18,
  },

  // Border radius — Neural panels are square (0) with one rounded
  // exception used for emphasized cards.
  borderRadius: {
    sm: 0,
    md: 0,
    lg: 0,
    xl: 8,
    round: "50%",
  },

  // Box shadows — Material-ish elevation set used for layered controls.
  shadows: {
    none: "none",
    sm:   "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
    md:   "0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",
    lg:   "0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)",
    xl:   "0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)",
    inner: "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
  },

  // Typography — pixel-based scale, Neural-scoped.
  typography: {
    fontFamily: '"Roboto", "Helvetica Neue", "Arial", sans-serif',
    fontFamilyMono: '"Roboto Mono", "Courier New", monospace',

    fontSize: {
      xs: 8,
      sm: 10,
      md: 12,
      lg: 16,
      xl: 18,
      xxl: 20,
      xxxl: 24,
    },

    fontWeight: {
      light:    300,
      normal:   400,
      medium:   500,
      semiBold: 600,
      bold:     700,
    },

    lineHeight: {
      tight:   1.2,
      normal:  1.5,
      relaxed: 1.75,
    },
  },

  // Transition durations — Neural module's tighter timings (the app's
  // tokens use 120ms/200ms; here we keep 150ms/200ms/300ms for the
  // graduated feel of the dense controls).
  transitions: {
    fast:   "150ms",
    normal: "200ms",
    slow:   "300ms",
    ease:   "cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // Component-specific size tables.
  components: {
    button: {
      height:  { sm: 28, md: 36, lg: 42 },
      padding: { sm: "4px 12px", md: "6px 16px", lg: "8px 24px" },
    },
    input: {
      height: { sm: 32, md: 40, lg: 48 },
    },
    iconButton: {
      size: { sm: 32, md: 40, lg: 48 },
    },
    card: {
      padding: { sm: 12, md: 16, lg: 24 },
    },
  },

  // Z-index layers for stacking.
  zIndex: {
    base:           0,
    dropdown:       1000,
    sticky:         1020,
    fixed:          1030,
    modalBackdrop:  1040,
    modal:          1050,
    popover:        1060,
    tooltip:        1070,
  },
};

/**
 * Helper to merge custom sx with shared base styles (font family,
 * antialiasing, transitions). Used by the older Neural controls; new
 * components prefer plain CSS classes.
 */
export const createSxProps = (overrides = {}) => ({
  fontFamily: controlsTheme.typography.fontFamily,
  transition: `all ${controlsTheme.transitions.normal} ${controlsTheme.transitions.ease}`,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  textRendering: "optimizeLegibility",
  fontFeatureSettings: '"kern" 1',
  ...overrides,
});

/**
 * Common button style presets used in legacy Neural sx={{...}} blocks.
 */
export const buttonStyles = {
  base: {
    fontFamily: controlsTheme.typography.fontFamily,
    fontSize: controlsTheme.typography.fontSize.md,
    fontWeight: controlsTheme.typography.fontWeight.semiBold,
    borderRadius: controlsTheme.borderRadius.md,
    padding: controlsTheme.components.button.padding.md,
    transition: `all ${controlsTheme.transitions.normal} ${controlsTheme.transitions.ease}`,
    textTransform: "none",
    boxShadow: controlsTheme.shadows.sm,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    textRendering: "optimizeLegibility",
    "&:hover": { boxShadow: controlsTheme.shadows.md },
    "&:disabled": {
      backgroundColor: controlsTheme.colors.disabled,
      color: controlsTheme.colors.disabledText,
      boxShadow: controlsTheme.shadows.none,
    },
  },

  primary: {
    backgroundColor: controlsTheme.colors.primary,
    color: controlsTheme.colors.text,
    "&:hover": { backgroundColor: controlsTheme.colors.primaryDark },
  },

  secondary: {
    backgroundColor: controlsTheme.colors.secondary,
    color: controlsTheme.colors.text,
    "&:hover": { backgroundColor: controlsTheme.colors.secondaryDark },
  },

  success: {
    backgroundColor: controlsTheme.colors.success,
    color: controlsTheme.colors.text,
    "&:hover": { backgroundColor: controlsTheme.colors.successDark },
  },

  warning: {
    backgroundColor: controlsTheme.colors.warning,
    color: controlsTheme.colors.text,
    "&:hover": { backgroundColor: controlsTheme.colors.warningDark },
  },

  danger: {
    backgroundColor: controlsTheme.colors.danger,
    color: controlsTheme.colors.text,
    "&:hover": { backgroundColor: controlsTheme.colors.dangerDark },
  },
};

/**
 * Common card/panel style presets.
 */
export const cardStyles = {
  base: {
    backgroundColor: controlsTheme.colors.paper,
    borderRadius: controlsTheme.borderRadius.lg,
    padding: controlsTheme.components.card.padding.md,
    boxShadow: controlsTheme.shadows.md,
    border: `1px solid ${controlsTheme.colors.border}`,
  },

  elevated: {
    backgroundColor: controlsTheme.colors.paperElevated,
    boxShadow: controlsTheme.shadows.lg,
  },
};

export default controlsTheme;

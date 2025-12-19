/**
 * controlsTheme.js
 * Shared design system for Neural Analysis control components
 * Provides consistent colors, spacing, typography, and other design tokens
 */

export const controlsTheme = {
  // Color palette - professional scientific interface
  colors: {
    // Primary actions and active states
    primary: "#2196f3",
    primaryLight: "#64b5f6",
    primaryDark: "#1976d2",
    primaryBg: "#e3f2fd",

    // Secondary actions and info
    secondary: "#00bcd4",
    secondaryLight: "#4dd0e1",
    secondaryDark: "#0097a7",
    secondaryBg: "#e0f7fa",

    // Success states (generate, confirm)
    success: "#4caf50",
    successLight: "#81c784",
    successDark: "#388e3c",
    successBg: "#e8f5e9",

    // Warning/caution (burst detection, important actions)
    warning: "#ff9800",
    warningLight: "#ffb74d",
    warningDark: "#f57c00",
    warningBg: "#fff3e0",

    // Danger/destructive actions (delete, clear)
    danger: "#f44336",
    dangerLight: "#e57373",
    dangerDark: "#d32f2f",
    dangerBg: "#ffebee",

    // Neutral colors
    disabled: "#cccccc",
    disabledText: "#666666",
    border: "#555555",
    borderLight: "#888888",
    divider: "#444444",

    // Text colors
    text: "#ffffff",
    textSecondary: "#aaaaaa",
    textDisabled: "#888888",

    // Background colors
    background: "#1e1e1e",
    backgroundLight: "#424242ff",
    backgroundDark: "#141414",
    paper: "#252525",
    paperElevated: "#2d2d2d",

    // ROI colors (for visual distinction)
    roi: [
      {
        bg: "rgba(0, 255, 0, 0.15)",
        border: "rgba(0, 255, 0, 0.7)",
        name: "Green",
      },
      {
        bg: "rgba(0, 0, 255, 0.12)",
        border: "rgba(0, 0, 255, 0.7)",
        name: "Blue",
      },
      {
        bg: "rgba(255, 0, 0, 0.12)",
        border: "rgba(255, 0, 0, 0.7)",
        name: "Red",
      },
      {
        bg: "rgba(255, 165, 0, 0.13)",
        border: "rgba(255, 165, 0, 0.7)",
        name: "Orange",
      },
      {
        bg: "rgba(128, 0, 128, 0.13)",
        border: "rgba(128, 0, 128, 0.7)",
        name: "Purple",
      },
      {
        bg: "rgba(0, 206, 209, 0.13)",
        border: "rgba(0, 206, 209, 0.7)",
        name: "Cyan",
      },
      {
        bg: "rgba(255, 192, 203, 0.13)",
        border: "rgba(255, 192, 203, 0.7)",
        name: "Pink",
      },
      {
        bg: "rgba(255, 255, 0, 0.13)",
        border: "rgba(255, 255, 0, 0.7)",
        name: "Yellow",
      },
    ],
  },

  // Spacing system (8px grid)
  spacing: {
    xs: 0,
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
    xxl: 18,
  },

  // Border radius for different component sizes
  borderRadius: {
    sm: 0,
    md: 0,
    lg: 0,
    xl: 8,
    round: "50%",
  },

  // Box shadows for elevation
  shadows: {
    none: "none",
    sm: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
    md: "0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",
    lg: "0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)",
    xl: "0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)",
    inner: "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
  },

  // Typography system
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
      light: 300,
      normal: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },

    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Transition durations for animations
  transitions: {
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // Component-specific sizes
  components: {
    button: {
      height: {
        sm: 28,
        md: 36,
        lg: 42,
      },
      padding: {
        sm: "4px 12px",
        md: "6px 16px",
        lg: "8px 24px",
      },
    },
    input: {
      height: {
        sm: 32,
        md: 40,
        lg: 48,
      },
    },
    iconButton: {
      size: {
        sm: 32,
        md: 40,
        lg: 48,
      },
    },
    card: {
      padding: {
        sm: 12,
        md: 16,
        lg: 24,
      },
    },
  },

  // Z-index layers for stacking
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

/**
 * Helper function to create MUI sx props with theme values
 * @param {Object} overrides - Custom styles to merge with base
 * @returns {Object} sx prop object
 */
export const createSxProps = (overrides = {}) => ({
  fontFamily: controlsTheme.typography.fontFamily,
  transition: `all ${controlsTheme.transitions.normal} ${controlsTheme.transitions.ease}`,
  // Text rendering optimizations for crisp, clean text
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  textRendering: "optimizeLegibility",
  fontFeatureSettings: '"kern" 1',
  ...overrides,
});

/**
 * Common button styles for consistency
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
    // Text rendering optimizations
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    textRendering: "optimizeLegibility",
    "&:hover": {
      boxShadow: controlsTheme.shadows.md,
    },
    "&:disabled": {
      backgroundColor: controlsTheme.colors.disabled,
      color: controlsTheme.colors.disabledText,
      boxShadow: controlsTheme.shadows.none,
    },
  },

  primary: {
    backgroundColor: controlsTheme.colors.primary,
    color: controlsTheme.colors.text,
    "&:hover": {
      backgroundColor: controlsTheme.colors.primaryDark,
    },
  },

  secondary: {
    backgroundColor: controlsTheme.colors.secondary,
    color: controlsTheme.colors.text,
    "&:hover": {
      backgroundColor: controlsTheme.colors.secondaryDark,
    },
  },

  success: {
    backgroundColor: controlsTheme.colors.success,
    color: controlsTheme.colors.text,
    "&:hover": {
      backgroundColor: controlsTheme.colors.successDark,
    },
  },

  warning: {
    backgroundColor: controlsTheme.colors.warning,
    color: controlsTheme.colors.text,
    "&:hover": {
      backgroundColor: controlsTheme.colors.warningDark,
    },
  },

  danger: {
    backgroundColor: controlsTheme.colors.danger,
    color: controlsTheme.colors.text,
    "&:hover": {
      backgroundColor: controlsTheme.colors.dangerDark,
    },
  },
};

/**
 * Common card/panel styles
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

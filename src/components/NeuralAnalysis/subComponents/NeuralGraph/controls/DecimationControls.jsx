import React from "react";
import {
  Paper,
  Box,
  Typography,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import theme, { createSxProps, buttonStyles } from "../styles/controlsTheme";
import "./DecimationControls.css";

/**
 * DecimationControls Component
 *
 * Controls for data decimation to reduce the number of data points displayed
 * while maintaining visual fidelity. Improves performance for large datasets.
 *
 * @param {boolean} decimationEnabled - Whether decimation is currently enabled
 * @param {function} setDecimationEnabled - Function to toggle decimation on/off
 * @param {number} decimationSamples - Number of samples to decimate to (50, 100, 200, 400)
 * @param {function} setDecimationSamples - Function to update decimation sample count
 */
const DecimationControls = ({
  decimationEnabled,
  setDecimationEnabled,
  decimationSamples,
  setDecimationSamples,
}) => {
  const sampleOptions = [50, 100, 200, 400];

  return (
    <Paper
      elevation={2}
      sx={createSxProps({
        padding: `${theme.spacing.lg}px`,
        marginBottom: `${theme.spacing.md}px`,
        marginTop: `${theme.spacing.md}px`,
        marginRight: `${theme.spacing.md}px`,
        backgroundColor: theme.colors.background,
        borderRadius: `${theme.borderRadius.lg}px`,
        border: `0.125rem solid ${theme.colors.border}`,
        display: "flex",
        flexDirection: "column",
      })}
    >
      {/* Section Header */}
      <Box
        sx={{
          display: "flex",
          // flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: `${theme.spacing.md}px`,
        }}
      >
        <FilterListIcon
          sx={{
            color: decimationEnabled
              ? theme.colors.primary
              : theme.colors.textDisabled,
            marginRight: `${theme.spacing.sm}px`,
            fontSize: `${theme.typography.fontSize.lg}px`,
          }}
        />
        <Typography
          variant="h6"
          sx={{
            color: theme.colors.text,
            fontSize: `${theme.typography.fontSize.md}px`,
            fontWeight: theme.typography.fontWeight.semibold,
            fontFamily: theme.typography.fontFamily,
          }}
        >
          Data Decimation
        </Typography>
      </Box>

      {/* Controls Container */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* ON/OFF Toggle */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={() => setDecimationEnabled(true)}
            disabled={decimationEnabled}
            sx={{
              ...buttonStyles.base,
              backgroundColor: "transparent",
              color: decimationEnabled
                ? theme.colors.primary
                : theme.colors.textDisabled,
              fontWeight: theme.typography.fontWeight.bold,
              fontSize: `${theme.typography.fontSize.sm}px`,
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
              borderRadius: `${theme.borderRadius.md}px`,
              "&:hover": {
                backgroundColor: "transparent",
              },
              "&:disabled": {
                backgroundColor: "transparent",
                color: theme.colors.primary,
              },
            }}
          >
            ON
          </IconButton>
          <Typography
            sx={{
              color: theme.colors.textSecondary,
              fontSize: `${theme.typography.fontSize.sm}px`,
            }}
          >
            /
          </Typography>
          <IconButton
            onClick={() => setDecimationEnabled(false)}
            disabled={!decimationEnabled}
            sx={{
              ...buttonStyles.base,
              backgroundColor: "transparent",
              color: !decimationEnabled
                ? theme.colors.danger
                : theme.colors.textDisabled,
              fontWeight: theme.typography.fontWeight.bold,
              fontSize: `${theme.typography.fontSize.sm}px`,
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
              borderRadius: `${theme.borderRadius.md}px`,
              "&:hover": {
                backgroundColor: "transparent",
              },
              "&:disabled": {
                backgroundColor: "transparent",
                color: theme.colors.danger,
              },
            }}
          >
            OFF
          </IconButton>
        </Box>

        {/* Sample Count Radio Group */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            // gap: `${theme.spacing.sm}px`,
            // paddingLeft: `${theme.spacing.md}px`,
            padding: `${theme.spacing.md}px`,
            border: `0.125rem solid ${theme.colors.border}`,
            backgroundColor: "rgb(180, 180, 180, 0.7)",
          }}
        >
          <FormLabel
            sx={{
              color: "#000000",
              fontSize: `${theme.typography.fontSize.sm}px`,
              fontWeight: theme.typography.fontWeight.bold,
              fontFamily: theme.typography.fontFamily,
              marginRight: `${theme.spacing.sm}px`,
            }}
          >
            Samples:
          </FormLabel>
          <RadioGroup
            row
            value={decimationSamples}
            onChange={(e) => setDecimationSamples(Number(e.target.value))}
            aria-label="decimation-samples"
            name="decimation-samples"
            sx={{ gap: `${theme.spacing.xs}px` }}
          >
            {sampleOptions.map((val) => (
              <FormControlLabel
                key={val}
                value={val}
                control={
                  <Radio
                    className="decimation-radio"
                    sx={{
                      color: decimationEnabled
                        ? theme.colors.primary
                        : theme.colors.textDisabled,
                      "&.Mui-checked": {
                        color: theme.colors.primary,
                      },
                      "&:hover": {
                        backgroundColor: "transparent",
                      },
                    }}
                  />
                }
                label={val}
                disabled={!decimationEnabled}
                sx={{
                  margin: 0,
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: "transparent",
                  },
                  "& .MuiFormControlLabel-label": {
                    fontSize: `${theme.typography.fontSize.sm}px`,
                    fontFamily: theme.typography.fontFamily,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: "#000000",
                  },
                  "& .MuiFormControlLabel-label.Mui-disabled": {
                    color: "#000000",
                  },
                }}
              />
            ))}
          </RadioGroup>
        </Box>
      </Box>

      {/* Info Text */}
      {/* {decimationEnabled && (
        <Box
          sx={{
            marginTop: `${theme.spacing.md}px`,
            padding: `${theme.spacing.sm}px`,
            backgroundColor: theme.colors.primaryBg,
            borderRadius: `${theme.borderRadius.sm}px`,
            borderLeft: `0.1875rem solid ${theme.colors.primary}`,
          }}
        >
          <Typography
            sx={{
              fontSize: `${theme.typography.fontSize.xs}px`,
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamily,
            }}
          >
            💡 Decimation reduces data points to {decimationSamples} samples for
            improved rendering performance
          </Typography>
        </Box>
      )} */}
    </Paper>
  );
};

export default DecimationControls;

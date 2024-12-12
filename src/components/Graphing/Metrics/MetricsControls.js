import React, { useContext, useState } from "react";
import BookmarkAddTwoToneIcon from "@mui/icons-material/BookmarkAddTwoTone";
import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import { DataContext } from "../../../providers/DataProvider";
import {
  Typography,
  IconButton,
  FormControl,
  ListItem,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from "@mui/material";
import "./MetricsControls.css";

export const MetricsControls = ({
  setMetricType,
  metricIndicator,
  setMetricIndicator,
  annotations,
  setAnnotations,
  setAnnotationRangeStart,
  setAnnotationRangeEnd,
}) => {
  const { savedMetrics, setSavedMetrics, extractedIndicators } =
    useContext(DataContext);
  const [selectedMetricType, setSelectedMetricType] = useState("Max");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);

  const handleMetricChange = (e) => {
    const newMetric = e.target.value;
    setSelectedMetricType(newMetric);
    setMetricType(newMetric);
  };

  const handleSaveMetric = () => {
    const newMetric = {
      id: savedMetrics.length + 1,
      metricType: selectedMetricType,
      range: annotations[0]
        ? [annotations[0].xMin, annotations[0].xMax]
        : [null, null],
    };
    setSavedMetrics((prevMetrics) => [...prevMetrics, newMetric]);
    console.log("savedMetrics: ", savedMetrics);
  };

  const handleDeleteMetric = (id) => {
    setSavedMetrics((prevMetrics) =>
      prevMetrics.filter((metric) => metric.id !== id)
    );
  };

  const handleSelectMetric = (metric) => {
    setSelectedMetricType(metric.metricType);
    setMetricType(metric.metricType);
    setAnnotationRangeStart(metric.range[0]);
    setAnnotationRangeEnd(metric.range[1]);

    setAnnotations(() => {
      const updatedAnnotation = {
        type: "box",
        xMax: metric.range ? metric.range[1] : "Min",
        xMin: metric.range ? metric.range[0] : "Max",
        yMin: "Min", // chartjs attempts to dynamically calculate Min and Max
        yMax: "Max",
        backgroundColor: "rgba(0, 255, 0, 0.2)",
        borderColor: "rgba(0, 255, 0, 1)",
        borderWidth: 2,
      };

      console.log(updatedAnnotation);
      return [updatedAnnotation]; // Replace with updated annotation
    });
  };

  const handleResetAnnotations = async () => {
    await setIsAnimating(true);
    setAnnotationRangeStart(null);
    setAnnotationRangeEnd(null);
    setAnnotations([]);
  };

  const handleIndicatorChange = (e) => {
    const newIndicator = e.target.value;
    setMetricIndicator(newIndicator);
  };

  // return (
  //   <div className="metrics__controls-container">
  //     <Button
  //       variant="contained"
  //       color="primary"
  //       className="save-metric-button"
  //       onClick={handleSaveMetric}
  //     >
  //       <BookmarkAddTwoToneIcon />
  //       <Typography>Save Metric</Typography>
  //     </Button>
  //     <div className="metrics__management">
  //       <FormControl component="fieldset" className="metrics__radio-container">
  //         <FormLabel component="legend">
  //           <Typography>Indicator</Typography>
  //         </FormLabel>
  //         <RadioGroup
  //           className="metrics__radio-container"
  //           aria-label="indicator-type"
  //           name="radio-group-indicator"
  //           value={metricIndicator}
  //           onChange={handleIndicatorChange}
  //           row
  //         >
  //           {extractedIndicators.map((indicator) => (
  //             <FormControlLabel
  //               key={indicator.id}
  //               value={indicator.id}
  //               control={<Radio />}
  //               label={indicator.indicatorName}
  //             />
  //           ))}
  //         </RadioGroup>
  //       </FormControl>
  //       <FormControl component="fieldset" className="metrics__radio-container">
  //         <FormLabel component="legend">
  //           <Typography>Metric</Typography>
  //         </FormLabel>
  //         <RadioGroup
  //           className="metrics__radio-container"
  //           aria-label="metric-type"
  //           name="radio-group-metrics"
  //           value={selectedMetricType}
  //           onChange={handleMetricChange}
  //           row
  //         >
  //           <FormControlLabel value="Max" control={<Radio />} label="Max" />
  //           <FormControlLabel value="Min" control={<Radio />} label="Min" />
  //           <FormControlLabel value="Slope" control={<Radio />} label="Slope" />
  //           <FormControlLabel
  //             value="rangeOfYValues"
  //             control={<Radio />}
  //             label="Max-Min"
  //           />
  //         </RadioGroup>
  //       </FormControl>
  //     </div>
  //     <section className="saved-metrics-list" style={{ marginTop: "0.25em" }}>
  //       <FormLabel>
  //         <Typography
  //           htmlFor="saved-metrics"
  //           style={{
  //             borderBottom: "solid 0.1em white",
  //           }}
  //         >
  //           Saved Metrics:
  //         </Typography>
  //       </FormLabel>
  //       {savedMetrics.length > 0 ? (
  //         savedMetrics.map((metric) => (
  //           <ListItem
  //             key={metric.id}
  //             onClick={() => {
  //               // setSelectedMetricType(metric); // Update selected metric
  //               handleSelectMetric(metric);
  //               setIsDropdownOpen(false); // Close dropdown after selection
  //             }}
  //             style={{
  //               display: "flex",
  //               alignItems: "center",
  //               padding: 0,
  //               cursor: "pointer",
  //               borderBottom: "none",
  //               backgroundImage:
  //                 "linear-gradient( rgb(96, 127, 190, 0.25) 0%,rgb(48, 79.5, 143, 0.15) 50%, rgb(0,32,96, 0.05) 70%)",
  //               boxShadow:
  //                 "0px 1px 2px 2px rgba(80, 80, 80, 0.25), 0px 1px 4px 4px rgb(100, 100, 100, 0.15), 0px 1px 8px 5px rgba(100, 100, 100, 0.07)",
  //             }}
  //           >
  //             <Typography style={{ fontSize: "0.75em" }}>
  //               {metric.metricType === "rangeOfYValues"
  //                 ? "Max-Min"
  //                 : metric.metricType}
  //             </Typography>
  //             <IconButton
  //               size="small"
  //               onClick={(e) => {
  //                 e.stopPropagation(); // Prevent click from selecting the metric
  //                 handleDeleteMetric(metric.id);
  //               }}
  //             >
  //               <DeleteForeverTwoToneIcon
  //                 sx={{
  //                   fontSize: 15,
  //                   color: "rgb(255,0,0, 0.7)",
  //                 }}
  //               />
  //             </IconButton>
  //           </ListItem>
  //         ))
  //       ) : (
  //         <Typography
  //           style={{
  //             display: "flex",
  //             padding: 0,
  //             color: "#888",
  //             textAlign: "center",
  //             fontSize: "0.7em",
  //           }}
  //         >
  //           No Saved Metrics
  //         </Typography>
  //       )}
  //       <Button
  //         className={`metrics-controls__reset-annotations ${
  //           isAnimating ? "animate-line" : ""
  //         }`}
  //         variant="outlined"
  //         color="primary"
  //         onClick={handleResetAnnotations}
  //         onAnimationEnd={() => setIsAnimating(false)} // Reset animation state
  //         disableRipple
  //       >
  //         <DisabledByDefaultTwoToneIcon />
  //         <Typography variant="h1">Clear Range</Typography>
  //       </Button>
  //     </section>
  //   </div>
  // );
  return (
    <div className="metrics__controls-container">
      <Button
        variant="contained"
        color="primary"
        className="save-metric-button"
        onClick={handleSaveMetric}
      >
        <BookmarkAddTwoToneIcon />
        <Typography>Save Metric</Typography>
      </Button>
      <div className="metrics__management">
        <FormControl component="fieldset" className="metrics__radio-container">
          <FormLabel component="legend">
            <Typography>Indicator</Typography>
          </FormLabel>
          <RadioGroup
            className="metrics__radio-container"
            aria-label="indicator-type"
            name="radio-group-indicator"
            value={metricIndicator}
            onChange={handleIndicatorChange}
            row
          >
            {extractedIndicators.map((indicator) => (
              <FormControlLabel
                key={indicator.id}
                value={indicator.id}
                control={<Radio />}
                label={indicator.indicatorName}
              />
            ))}
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset" className="metrics__radio-container">
          <FormLabel component="legend">
            <Typography>Metric</Typography>
          </FormLabel>
          <RadioGroup
            className="metrics__radio-container"
            aria-label="metric-type"
            name="radio-group-metrics"
            value={selectedMetricType}
            onChange={handleMetricChange}
            row
          >
            <FormControlLabel value="Max" control={<Radio />} label="Max" />
            <FormControlLabel value="Min" control={<Radio />} label="Min" />
            <FormControlLabel value="Slope" control={<Radio />} label="Slope" />
            <FormControlLabel
              value="rangeOfYValues"
              control={<Radio />}
              label="Max-Min"
            />
          </RadioGroup>
        </FormControl>
      </div>

      <section className="saved-metrics-list-container">
        <FormLabel>
          <Typography
            htmlFor="saved-metrics"
            style={{
              borderBottom: "solid 0.1em white",
            }}
          >
            Saved Metrics:
          </Typography>
        </FormLabel>
        <div className="saved-metrics-list">
          {savedMetrics.length > 0 ? (
            savedMetrics.map((metric) => (
              <ListItem
                key={metric.id}
                onClick={() => {
                  handleSelectMetric(metric);
                  setIsDropdownOpen(false); // Close dropdown after selection
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  cursor: "pointer",
                  borderBottom: "none",
                  backgroundImage:
                    "linear-gradient(rgb(96, 127, 190, 0.25) 0%,rgb(48, 79.5, 143, 0.15) 50%, rgb(0,32,96, 0.05) 70%)",
                  boxShadow:
                    "0px 1px 2px 2px rgba(80, 80, 80, 0.25), 0px 1px 4px 4px rgb(100, 100, 100, 0.15), 0px 1px 8px 5px rgba(100, 100, 100, 0.07)",
                }}
              >
                <Typography style={{ fontSize: "1em", paddingLeft: "0.5em" }}>
                  {metric.metricType === "rangeOfYValues"
                    ? "Max-Min"
                    : metric.metricType}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent click from selecting the metric
                    handleDeleteMetric(metric.id);
                  }}
                >
                  <DeleteForeverTwoToneIcon
                    sx={{
                      fontSize: "1em",
                      color: "rgb(255,0,0, 0.7)",
                      paddingRight: "0.5em",
                    }}
                  />
                </IconButton>
              </ListItem>
            ))
          ) : (
            <Typography
              style={{
                display: "flex",
                padding: 0,
                color: "#888",
                textAlign: "center",
                fontSize: "0.7em",
              }}
            >
              No Saved Metrics
            </Typography>
          )}
        </div>
      </section>
      <Button
        className={`metrics-controls__reset-annotations ${
          isAnimating ? "animate-line" : ""
        }`}
        variant="outlined"
        color="primary"
        onClick={handleResetAnnotations}
        onAnimationEnd={() => setIsAnimating(false)} // Reset animation state
        disableRipple
      >
        <DisabledByDefaultTwoToneIcon />
        <Typography variant="h1">Clear Range</Typography>
      </Button>
    </div>
  );
};

export default MetricsControls;

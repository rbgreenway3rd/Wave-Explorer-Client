// MetricsUtilities.js
import * as d3 from "d3";

export const linearRegression = (data) => {
  let xsum = 0;
  let ysum = 0;
  for (let i = 0; i < data.length; i++) {
    xsum += data[i].x;
    ysum += data[i].y;
  }
  const xmean = xsum / data.length;
  const ymean = ysum / data.length;

  let num = 0;
  let denom = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i].x;
    const y = data[i].y;
    num += (x - xmean) * (y - ymean);
    denom += (x - xmean) * (x - xmean);
  }
  return num / denom;
};

export const calculateSlope = (heatmapData) => {
  // console.log(heatmapData);
  return heatmapData.length > 0 ? linearRegression(heatmapData) : 0;
};

export const calculateRange = (heatmapData) => {
  if (heatmapData.length === 0) return 0; // If no data, return 0

  const maxY = d3.max(heatmapData, (d) => d.y);
  const minY = d3.min(heatmapData, (d) => d.y);
  // console.log(maxY - minY);
  return maxY - minY; // Return the range (difference between max and min)
};

export const getAllValues = (wellArrays, annotationRange, metricIndicator) => {
  return wellArrays.flatMap((well) => {
    const filteredData = well.indicators[metricIndicator]?.filteredData || [];
    if (annotationRange.start !== null && annotationRange.end !== null) {
      return filteredData
        .filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        )
        .map((d) => d.y);
    } else {
      return filteredData.map((d) => d.y);
    }
  });
};

export const getAllSlopes = (wellArrays, annotationRange, metricIndicator) => {
  return wellArrays.flatMap((well) => {
    let heatmapData = well.indicators[metricIndicator]?.filteredData || [];

    if (annotationRange.start !== null && annotationRange.end !== null) {
      heatmapData = heatmapData.filter(
        (_, i) => i >= annotationRange.start && i <= annotationRange.end
      );
    }
    return calculateSlope(heatmapData);
  });
};

export const getAllRanges = (wellArrays, annotationRange, metricIndicator) => {
  return wellArrays.map((well) => {
    let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
    if (annotationRange.start !== null && annotationRange.end !== null) {
      heatmapData = heatmapData.filter(
        (_, i) => i >= annotationRange.start && i <= annotationRange.end
      );
    }

    return calculateRange(heatmapData);
  });
};

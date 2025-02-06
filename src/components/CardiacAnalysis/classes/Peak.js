export class Peak {
  constructor(
    peakCoords,
    leftBaseCoords,
    rightBaseCoords,
    prominences,
    data,
    useAdjustedBases = false,
    adjustedLeftBaseCoords = null,
    adjustedRightBaseCoords = null
  ) {
    this.peakCoords = peakCoords;
    this.leftBaseCoords = leftBaseCoords;
    this.rightBaseCoords = rightBaseCoords;
    this.prominences = prominences;
    this.data = data;
    this.useAdjustedBases = useAdjustedBases;
    this.adjustedLeftBaseCoords = adjustedLeftBaseCoords;
    this.adjustedRightBaseCoords = adjustedRightBaseCoords;
    this.ascentAnalysis = this.analyzeAscent();
    this.descentAnalysis = this.analyzeDescent();
  }

  analyzeAscent() {
    const ascentPoints = [];
    const baseCoords =
      this.useAdjustedBases && this.adjustedLeftBaseCoords
        ? this.adjustedLeftBaseCoords
        : this.leftBaseCoords;
    const yDistance = this.peakCoords.y - baseCoords.y;

    for (let i = 1; i <= 9; i++) {
      const percentage = i / 10;
      const yValue = baseCoords.y + percentage * yDistance;
      const xValue = this.getXValueAtY(yValue, baseCoords.x, this.peakCoords.x);
      ascentPoints.push({ x: xValue, y: yValue });
    }

    return ascentPoints;
  }

  analyzeDescent() {
    const descentPoints = [];
    const baseCoords =
      this.useAdjustedBases && this.adjustedRightBaseCoords
        ? this.adjustedRightBaseCoords
        : this.rightBaseCoords;
    const yDistance = this.peakCoords.y - baseCoords.y;

    for (let i = 1; i <= 9; i++) {
      const percentage = i / 10;
      const yValue = this.peakCoords.y - percentage * yDistance;
      const xValue = this.getXValueAtY(yValue, this.peakCoords.x, baseCoords.x);
      descentPoints.push({ x: xValue, y: yValue });
    }

    return descentPoints;
  }

  getXValueAtY(yValue, xStart, xEnd) {
    // Find the closest data points with the same y value within the range [xStart, xEnd]
    const pointsInRange = this.data.filter(
      (point) => point.x >= xStart && point.x <= xEnd
    );
    if (pointsInRange.length === 0) {
      return null; // No points in range
    }

    let closestPoint = pointsInRange.reduce((prev, curr) => {
      return Math.abs(curr.y - yValue) < Math.abs(prev.y - yValue)
        ? curr
        : prev;
    });

    // If the exact y value is found, return the corresponding x value
    if (closestPoint.y === yValue) {
      return closestPoint.x;
    }

    // Find the two closest points for interpolation
    let lowerPoint = null;
    let upperPoint = null;
    for (let point of pointsInRange) {
      if (point.y <= yValue && (!lowerPoint || point.y > lowerPoint.y)) {
        lowerPoint = point;
      }
      if (point.y >= yValue && (!upperPoint || point.y < upperPoint.y)) {
        upperPoint = point;
      }
    }

    // If we have both lower and upper points, interpolate to estimate the x value
    if (lowerPoint && upperPoint && lowerPoint !== upperPoint) {
      const xDiff = upperPoint.x - lowerPoint.x;
      const yDiff = upperPoint.y - lowerPoint.y;
      const yRatio = (yValue - lowerPoint.y) / yDiff;
      return lowerPoint.x + yRatio * xDiff;
    }

    // If we only have one point, return its x value
    return closestPoint.x;
  }
}

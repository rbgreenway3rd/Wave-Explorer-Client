/**
 * Filters out data points between any left and right bases, but includes the bases themselves.
 * @param {Array} data - The original data array.
 * @param {Array} peaks - The array of Peak objects.
 * @returns {Array} - The filtered data array.
 */
function prepareQuadraticData(data, peaks) {
  const filteredData = [];
  let omitRanges = [];

  // Collect ranges to omit
  for (let peak of peaks) {
    const leftBaseIndex = data.findIndex(
      (point) => point.x === peak.leftBaseCoords.x
    );
    const rightBaseIndex = data.findIndex(
      (point) => point.x === peak.rightBaseCoords.x
    );

    if (leftBaseIndex !== -1 && rightBaseIndex !== -1) {
      omitRanges.push([leftBaseIndex + 1, rightBaseIndex - 1]);
    }
  }

  // Filter data points
  for (let i = 0; i < data.length; i++) {
    let omit = false;
    for (let range of omitRanges) {
      if (i >= range[0] && i <= range[1]) {
        omit = true;
        break;
      }
    }
    if (!omit) {
      filteredData.push(data[i]);
    }
  }

  return filteredData;
}

/**
 * Performs quadratic regression on the filtered data.
 * @param {Array} data - The filtered data array.
 * @returns {Object} - The coefficients of the quadratic equation.
 */
function quadraticRegression(data) {
  const n = data.length;
  let sumX = 0,
    sumY = 0,
    sumX2 = 0,
    sumX3 = 0,
    sumX4 = 0,
    sumXY = 0,
    sumX2Y = 0;

  for (let point of data) {
    const x = point.x;
    const y = point.y;
    const x2 = x * x;
    const x3 = x2 * x;
    const x4 = x3 * x;
    const xy = x * y;
    const x2y = x2 * y;

    sumX += x;
    sumY += y;
    sumX2 += x2;
    sumX3 += x3;
    sumX4 += x4;
    sumXY += xy;
    sumX2Y += x2y;
  }

  const matrix = [
    [n, sumX, sumX2],
    [sumX, sumX2, sumX3],
    [sumX2, sumX3, sumX4],
  ];

  const constants = [sumY, sumXY, sumX2Y];

  const coefficients = solveMatrix(matrix, constants);

  return {
    a: coefficients[2],
    b: coefficients[1],
    c: coefficients[0],
  };
}

/**
 * Solves a system of linear equations using Gaussian elimination.
 * @param {Array} matrix - The coefficient matrix.
 * @param {Array} constants - The constants array.
 * @returns {Array} - The solution array.
 */
function solveMatrix(matrix, constants) {
  const n = matrix.length;

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }

    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
    [constants[i], constants[maxRow]] = [constants[maxRow], constants[i]];

    for (let k = i + 1; k < n; k++) {
      const factor = matrix[k][i] / matrix[i][i];
      constants[k] -= factor * constants[i];
      for (let j = i; j < n; j++) {
        matrix[k][j] -= factor * matrix[i][j];
      }
    }
  }

  const solution = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    solution[i] = constants[i] / matrix[i][i];
    for (let k = i - 1; k >= 0; k--) {
      constants[k] -= matrix[k][i] * solution[i];
    }
  }

  return solution;
}

export { prepareQuadraticData, quadraticRegression };

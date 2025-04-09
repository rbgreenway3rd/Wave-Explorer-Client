const math = require("mathjs"); // for use in median calculation (math.median)

export const findBaseline = (selectedWell) => {
  const pre_AP_window = 20;
  const num_of_index_after_peak = 20;
  const windowSize = 100;
  const numMinimums = 30;
  let baseline = [];
  for (let j = 0; j < selectedWell.length; j++) {
    let startIdx = Math.max(0, j - Math.floor(windowSize / 2));
    let endIdx = Math.min(
      selectedWell.length - 1,
      j + Math.floor(windowSize / 2)
    );
    let currentWindow = selectedWell.slice(startIdx, endIdx);

    // Extract y values from the currentWindow
    let yValues = currentWindow.map((point) => point.y);

    let sortedWindow = [...yValues].sort((a, b) => a - b);
    let minPoints = sortedWindow.slice(
      0,
      Math.min(numMinimums, sortedWindow.length)
    );

    baseline.push(math.median(minPoints));
  }

  //   let filteredData = selectedWell.map((val, idx) =>  val.y - baseline[idx]);
  // Refactor to return a tuple {x: val.x, y: val.y - baseline[idx]}
  let baselineData = selectedWell.map((val, idx) => ({
    x: val.x,
    y: val.y - baseline[idx],
  }));
  //   filteredData = math.median(filteredData, 5); // Applying median filter (approximation)
  //   filteredData = math.median(filteredData); // Applying median filter (approximation)

  return baselineData;
};

import { findPeaks } from "./PeakFinder";

const foundPeaks = [];
// const num = 3;
let optimalWindowWidth = 0;

export const calculateWindowWidth = (data, prominence, num) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Data must be a non-empty array.");
  }
  if (num < 1) {
    throw new Error("num must be at least 1.");
  }

  // Initialize foundPeaks array with zeros
  //   console.log("beginnging function")
  //   for (let i = 0; i < num; i++) {
  //     foundPeaks[i] = 0;
  //     console.log("foundPeaks initialized", foundPeaks);
  //   }
  for (let ww = 10; ww < data.length; ww += 5) {
    let num = 4;
    console.log("1");
    const peaks = findPeaks(data, prominence, ww);
    const numPeaks = peaks.length;
    foundPeaks.push(numPeaks);
    if (foundPeaks.length > num) {
      foundPeaks.shift();
      console.log("2");
    }
    if (foundPeaks.length === num) {
      console.log("3");
      //       if (foundPeaks[0] === foundPeaks[1] && foundPeaks[1] === foundPeaks[2]) {
      //         console.log("4");
      //         optimalWindowWidth = ww;
      //         console.log(optimalWindowWidth);
      //         break;
      //       }
      //     }
      //     return optimalWindowWidth;
      //   }
      // };
      const average = foundPeaks.reduce((sum, value) => sum + value, 0) / num;
      const allEqualToAverage = foundPeaks.every((value) => value === average);

      if (allEqualToAverage) {
        console.log("4");
        optimalWindowWidth = ww;
        break;
      }
    }
  }
  console.log(optimalWindowWidth);
  return optimalWindowWidth;
};

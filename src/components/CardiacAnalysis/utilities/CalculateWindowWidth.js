// import { findPeaks } from "./PeakFinder";

// // const foundPeaks = [];
// // let optimalWindowWidth = 0;

// export const calculateWindowWidth = (data, prominence, num) => {
//   const foundPeaks = [];
//   let optimalWindowWidth = 0;
//   if (!Array.isArray(data) || data.length === 0) {
//     throw new Error("Data must be a non-empty array.");
//   }
//   if (num < 1) {
//     throw new Error("num must be at least 1.");
//   }

//   // LOGIC IS DEPENDENT ALSO ON PEAK PROMINENCE
//   // CONSIDER ADDING PEAK PROMINENCE TO ALGORITHM

//   for (let ww = 10; ww < data.length; ww += 2) {
//     let num = 10;
//     console.log("1");
//     const peaks = findPeaks(data, prominence, ww);
//     const numPeaks = peaks.length;
//     foundPeaks.push(numPeaks);
//     if (foundPeaks.length > num) {
//       foundPeaks.shift();
//       console.log("2");
//     }
//     if (foundPeaks.length === num) {
//       console.log("3");

//       const average = foundPeaks.reduce((sum, value) => sum + value, 0) / num;
//       const allEqualToAverage = foundPeaks.every((value) => value === average);

//       if (allEqualToAverage) {
//         console.log("4");
//         optimalWindowWidth = ww;
//         break;
//       }
//     }
//   }
//   console.log(optimalWindowWidth);
//   return optimalWindowWidth;
// };
import { findPeaks } from "./PeakFinder";
import { useContext } from "react";
import { AnalysisContext } from "../AnalysisProvider";

export const calculateWindowWidth = (
  data,
  prominence,
  num
  // setFindPeaksWindowWidth
) => {
  // const { setFindPeaksWindowWidth } = useContext(AnalysisContext);
  const foundPeaks = [];
  let optimalWindowWidth = 0;

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Data must be a non-empty array.");
  }
  if (num < 1) {
    throw new Error("num must be at least 1.");
  }

  for (let ww = 10; ww < data.length; ww += 2) {
    let num = 10;
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

  // Update the state with the final optimalWindowWidth
  // if (setFindPeaksWindowWidth) {
  // setFindPeaksWindowWidth(optimalWindowWidth);
  // }

  return optimalWindowWidth;
};

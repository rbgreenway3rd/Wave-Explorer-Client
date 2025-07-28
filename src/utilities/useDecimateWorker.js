// useDecimateWorker.js
import { useRef, useEffect, useCallback } from "react";

const useDecimateWorker = () => {
  const workerRef = useRef();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/decimateWorker.js", import.meta.url)
    );
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  // decimate: (data, samples) => Promise<decimatedArray>
  const decimate = useCallback((data, samples) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return resolve(data);
      const handleMessage = (e) => {
        if (e.data && e.data.decimated) {
          resolve(e.data.decimated);
        } else {
          reject(new Error("Worker returned no decimated data"));
        }
        workerRef.current.removeEventListener("message", handleMessage);
      };
      workerRef.current.addEventListener("message", handleMessage);
      workerRef.current.postMessage({ data, samples });
    });
  }, []);

  return { decimate };
};

export default useDecimateWorker;

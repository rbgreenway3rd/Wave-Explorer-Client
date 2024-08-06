import React, { useState, useContext, useEffect } from "react";
import { AnalysisFramesContext } from "./AnalysisFramesProvider";

export const AnalysisFrameGraph = () => {
  const {
    analysisFrames,
    getAllAnalysisFrames,
    getAnalysisFrameById,
    createAnalysisFrame,
    updateAnalysisFrame,
    deleteAnalysisFrame,
  } = useContext(AnalysisFramesContext);
  // const history = useHistory(); deprecated?

  useEffect(() => {
    getAllAnalysisFrames();
  }, []);

  return (
    <section>
      analysis frames testing
      <div>
        {analysisFrames.map((analysisFrame) => (
          <div
            className="analysisFrame"
            id={`analysisFrame--${analysisFrame.analysisframeid}`}
            key={analysisFrame.analysisframeid}
          >
            <p>Analysis Frame:</p>
            <a>analysisFrame id = {analysisFrame.analysisframeid}</a>
            <a>sequence number = {analysisFrame.sequencenumber}</a>
            <a>rows: {analysisFrame.rows}</a>
            <a>columns: {analysisFrame.cols}</a>
            <a>valuestring: {analysisFrame.valuestring}</a>
          </div>
        ))}
      </div>
    </section>
  );
};

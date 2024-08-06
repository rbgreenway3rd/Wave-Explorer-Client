import React, { useState, useEffect } from "react";

const API_BASE_URL = "http://localhost:8000/";

export const AnalysisFramesContext = React.createContext();

export const AnalysisFrameProvider = (props) => {
  const [analysisFrames, setAnalysisFrames] = useState([]);

  // Retrieve a list of analysis frames
  function getAllAnalysisFrames() {
    return fetch(`${API_BASE_URL}analysisframes`, {
      method: "GET",
      mode: "cors",
      headers: {
        "Access-Control-Allow-Headers": "Accept",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Request-Method": "GET",
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then(setAnalysisFrames)
      .then(console.log(analysisFrames))
      .catch((error) => console.error(error));
  }

  // BELOW FUNCTIONS ARE OUTDATED AND NEED TO BE REWRITTEN

  // Retrieve a single analysis frame by ID
  function getAnalysisFrameById(id) {
    return fetch(`${API_BASE_URL}analysisframes/${id}/`)
      .then((response) => response.json())
      .catch((error) => console.error(error));
  }

  // Create a new analysis frame
  function createAnalysisFrame(data) {
    return fetch(`${API_BASE_URL}analysisframes/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .catch((error) => console.error(error));
  }

  // Update an existing analysis frame
  function updateAnalysisFrame(id, data) {
    return fetch(`${API_BASE_URL}analysisframes/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .catch((error) => console.error(error));
  }

  // Delete an analysis frame by ID
  function deleteAnalysisFrame(id) {
    return fetch(`${API_BASE_URL}analysisframes/${id}/`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .catch((error) => console.error(error));
  }

  return (
    <AnalysisFramesContext.Provider
      value={{
        analysisFrames,
        getAllAnalysisFrames,
        getAnalysisFrameById,
        createAnalysisFrame,
        updateAnalysisFrame,
        deleteAnalysisFrame,
      }}
    >
      {/* {props.children} */}
    </AnalysisFramesContext.Provider>
  );
};

export default AnalysisFrameProvider;

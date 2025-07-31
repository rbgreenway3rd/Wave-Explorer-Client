import React, { useState, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import "./BatchProcessing.css";

const BatchProcessing = ({ open, onClose }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleAddFile = (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="batch-processing-dialog">
      <DialogTitle>Batch Report Generation</DialogTitle>
      <DialogContent>
        <button
          className="batch-processing-add-btn"
          onClick={handleButtonClick}
        >
          Add .DAT file
        </button>
        <input
          type="file"
          accept=".dat"
          multiple
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleAddFile}
        />
        <div className="batch-processing-list-container">
          <ul className="batch-processing-list">
            {uploadedFiles.map((file, idx) => (
              <li key={idx} className="batch-processing-list-item">
                <div>
                  {file.name}
                  <IconButton
                    className="batch-processing-remove-btn"
                    onClick={() =>
                      setUploadedFiles((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                  >
                    <DeleteForeverTwoToneIcon
                      sx={{
                        fontSize: "1em",
                        color: "rgb(255,0,0, 0.7)",
                        paddingRight: "0.5em",
                      }}
                    />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Close
        </Button>
        {/* Future: Add button to start batch report generation */}
      </DialogActions>
    </Dialog>
  );
};

export default BatchProcessing;

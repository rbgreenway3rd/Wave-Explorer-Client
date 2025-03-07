import React from "react";
import {
  Modal,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const ResultModal = ({ open, handleClose, results }) => {
  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          width: "80%",
          margin: "auto",
          marginTop: "5%",
          padding: "2em",
          backgroundColor: "white",
          borderRadius: "8px",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Analysis Results
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Well</TableCell>
                <TableCell>APD90</TableCell>
                <TableCell>APD80</TableCell>
                <TableCell>APD70</TableCell>
                <TableCell>APD60</TableCell>
                <TableCell>APD50</TableCell>
                <TableCell>APD40</TableCell>
                <TableCell>APD30</TableCell>
                <TableCell>APD20</TableCell>
                <TableCell>APD10</TableCell>
                <TableCell>Num Peaks Detected</TableCell>
                <TableCell>Num Peaks Analyzed</TableCell>
                <TableCell>Peak Amplitude</TableCell>
                <TableCell>RR Interval</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.Well}</TableCell>
                  <TableCell>{row.APD90}</TableCell>
                  <TableCell>{row.APD80}</TableCell>
                  <TableCell>{row.APD70}</TableCell>
                  <TableCell>{row.APD60}</TableCell>
                  <TableCell>{row.APD50}</TableCell>
                  <TableCell>{row.APD40}</TableCell>
                  <TableCell>{row.APD30}</TableCell>
                  <TableCell>{row.APD20}</TableCell>
                  <TableCell>{row.APD10}</TableCell>
                  <TableCell>{row.Num_Peaks_Detected}</TableCell>
                  <TableCell>{row.Num_Peaks_Analyzed}</TableCell>
                  <TableCell>{row.Peak_Amplitude}</TableCell>
                  <TableCell>{row.RR_Interval}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Modal>
  );
};

export default ResultModal;

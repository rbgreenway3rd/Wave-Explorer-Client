import React, { useContext, useState } from "react";
import "../../styles/NavBar.css";
// import WaveGuideLogo from "../../assets/brand/WaveGuideLogo.gif"; // Import the gif file
import WaveGuideLogo from "../../../src/assets/brand/WaveGuideLogo.webp"; // Absolute path from src
import WaveGuideIcon from "../../../src/assets/brand/WaveGuideIcon.ico";
import WaveFrontLogo from "../../../src/assets/brand/WaveFrontLogo.webp";
import FileUploader from "../FileHandling/FileUploader";
import { DataContext } from "../../providers/DataProvider";
import Typography from "@mui/material/Typography";
import NavMenu from "./NavMenu";
import {
  FormLabel,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  AddAPhotoTwoTone,
  ScreenshotMonitorTwoTone,
} from "@mui/icons-material";
import HelpTwoToneIcon from "@mui/icons-material/HelpTwoTone";
import { handleScreenshot } from "../../utilities/Handlers";
import { supabase } from "../../supabaseClient";
import ProfileMenu from "./ProfileMenu";
import CardiacAnalysisModal from "../CardiacAnalysis/CardiacAnalysisModal";
import { AnalysisProvider } from "../CardiacAnalysis/AnalysisProvider";
import NeuralAnalysisModal from "../NeuralAnalysis/NeuralAnalysisModal";
import { NeuralProvider } from "../NeuralAnalysis/NeuralProvider";
import { PERMISSIONS } from "../../permissions";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ElectricBoltTwoToneIcon from "@mui/icons-material/ElectricBoltTwoTone";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import BatchProcessing from "../FileHandling/BatchProcessing";

export const NavBar = ({ combinedComponentRef, profile, setProfile }) => {
  const { project } = useContext(DataContext);
  const [wellArraysUpdated, setWellArraysUpdated] = useState(false);
  const [file, setFile] = useState(null); // State to store the uploaded file

  // Cardiac Analysis modal state and feature gating
  const [cardiacModalOpen, setCardiacModalOpen] = useState(false);
  const canOpenCardiac =
    (profile?.permissions & PERMISSIONS.CARDIAC) === PERMISSIONS.CARDIAC ||
    (profile?.permissions & PERMISSIONS.ADMIN) === PERMISSIONS.ADMIN;

  const handleOpenCardiacModal = () => setCardiacModalOpen(true);
  const handleCloseCardiacModal = () => setCardiacModalOpen(false);

  // Neural Analysis modal state and feature gating
  const [neuralModalOpen, setNeuralModalOpen] = useState(false);
  const canOpenNeural =
    (profile?.permissions & PERMISSIONS.NEURAL) === PERMISSIONS.NEURAL ||
    (profile?.permissions & PERMISSIONS.ADMIN) === PERMISSIONS.ADMIN;

  const handleOpenNeuralModal = () => setNeuralModalOpen(true);
  const handleCloseNeuralModal = () => setNeuralModalOpen(false);

  // Batch Processing dialog state and handlers
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const handleOpenBatchDialog = () => setBatchDialogOpen(true);
  const handleCloseBatchDialog = () => setBatchDialogOpen(false);

  return (
    <header className="navbar-container">
      <section className="navbar-left">
        <Tooltip title="Help Getting Started" arrow>
          <IconButton
            onClick={() =>
              window.open(
                `${process.env.PUBLIC_URL}/WebWaveExplorer_QuickStart.pdf`
              )
            }
          >
            <HelpTwoToneIcon
              sx={{
                marginRight: "0.25em",
              }}
            />
          </IconButton>
        </Tooltip>
        <FileUploader
          setWellArraysUpdated={setWellArraysUpdated}
          setFile={setFile}
        />
        {project ? (
          <>
            <NavMenu
              profile={profile}
              onOpenCardiac={
                canOpenCardiac ? handleOpenCardiacModal : undefined
              }
            />
          </>
        ) : (
          ""
        )}
        {/* Batch Processing IconButton */}
        <Tooltip title="Batch Processing" arrow>
          <span style={{ marginLeft: "1em" }}>
            <IconButton
              className="batchProcessingButton"
              onClick={handleOpenBatchDialog}
              color={batchDialogOpen ? "primary" : "default"}
              sx={{
                border: "1px solid rgba(150, 150, 150, 1)",
                borderRadius: 0,
              }}
            >
              <DynamicFeedIcon />
            </IconButton>
          </span>
        </Tooltip>
        {/* Cardiac Analysis IconButton */}
        {project ? (
          <>
            <Tooltip title="Cardiac Analysis" arrow>
              <span style={{ marginLeft: "0.25em" }}>
                <IconButton
                  className="cardiacAnalysisButton"
                  onClick={canOpenCardiac ? handleOpenCardiacModal : undefined}
                  disabled={!canOpenCardiac}
                  color={cardiacModalOpen ? "primary" : "default"}
                  sx={{
                    // background: "rgba(93, 93, 93, 0.2)",
                    border: "1px solid rgba(150, 150, 150, 1)",
                    borderRadius: 0,
                  }}
                >
                  <FavoriteBorderIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Neural Analysis" arrow>
              <span style={{ marginLeft: "0.25em" }}>
                <IconButton
                  className="neuralAnalysisButton"
                  onClick={canOpenNeural ? handleOpenNeuralModal : undefined}
                  disabled={!canOpenNeural}
                  color={neuralModalOpen ? "primary" : "default"}
                  sx={{
                    border: "1px solid rgba(150, 150, 150, 1)",
                    borderRadius: 0,
                  }}
                >
                  <ElectricBoltTwoToneIcon
                    style={{
                      transform: "rotate(60deg) scaleX(-1)",
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
          </>
        ) : (
          ""
        )}
        {/* Batch Processing Dialog */}
        <BatchProcessing
          open={batchDialogOpen}
          onClose={handleCloseBatchDialog}
        />
      </section>
      <section className="navbar-middle">
        {/* Display the file name */}
        {/* {file && <Typography>file name: {file.name}</Typography>} */}
        {project ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Typography style={{ marginRight: "1em" }}>
              {project.title}
            </Typography>
            <Tooltip
              title="Capture Screenshot of Entire Window"
              disableInteractive
              arrow
            >
              <IconButton
                onClick={() => handleScreenshot(combinedComponentRef)}
              >
                <AddAPhotoTwoTone />
              </IconButton>
            </Tooltip>
            {/* Cardiac Analysis IconButton */}
          </div>
        ) : (
          ""
        )}
      </section>
      <section className="navbar-right">
        <img
          src={WaveGuideLogo}
          alt="WaveGuide logo"
          className="wave-explorer-icon"
        />{" "}
        <h1 className="logo">aveExplorer</h1>
        <ProfileMenu profile={profile} setProfile={setProfile} />
      </section>
      {/* Cardiac Analysis Modal now in NavBar */}
      <AnalysisProvider>
        <CardiacAnalysisModal
          open={cardiacModalOpen}
          onClose={handleCloseCardiacModal}
          project={project}
        />
      </AnalysisProvider>
      <NeuralProvider>
        <NeuralAnalysisModal
          open={neuralModalOpen}
          onClose={handleCloseNeuralModal}
        />
      </NeuralProvider>
    </header>
  );
};

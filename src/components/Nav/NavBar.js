import React, { useContext, useState } from "react";
import "../../styles/NavBar.css";
import WaveGuideLogo from "../../../src/assets/brand/WaveGuideLogo.webp";
import FileUploader from "../FileHandling/FileUploader";
import { DataContext } from "../../providers/DataProvider";
import Typography from "@mui/material/Typography";
import NavMenu from "./NavMenu";
import { IconButton, Tooltip } from "@mui/material";
import { AddAPhotoTwoTone } from "@mui/icons-material";
import HelpTwoToneIcon from "@mui/icons-material/HelpTwoTone";
import { handleScreenshot } from "../../utilities/Handlers";
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
  const [file, setFile] = useState(null);

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
            <HelpTwoToneIcon />
          </IconButton>
        </Tooltip>
        <FileUploader
          setWellArraysUpdated={setWellArraysUpdated}
          setFile={setFile}
        />
        {project && (
          <NavMenu
            profile={profile}
            onOpenCardiac={canOpenCardiac ? handleOpenCardiacModal : undefined}
          />
        )}

        <Tooltip title="Batch Processing" arrow>
          <span className="navbar__action-slot">
            <IconButton
              className="navbar__action-button batchProcessingButton"
              onClick={handleOpenBatchDialog}
              color={batchDialogOpen ? "primary" : "default"}
            >
              <DynamicFeedIcon />
            </IconButton>
          </span>
        </Tooltip>

        {project && (
          <>
            <Tooltip title="Cardiac Analysis" arrow>
              <span className="navbar__action-slot">
                <IconButton
                  className="navbar__action-button cardiacAnalysisButton"
                  onClick={canOpenCardiac ? handleOpenCardiacModal : undefined}
                  disabled={!canOpenCardiac}
                  color={cardiacModalOpen ? "primary" : "default"}
                >
                  <FavoriteBorderIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Advanced Analysis" arrow>
              <span className="navbar__action-slot">
                <IconButton
                  className="navbar__action-button neuralAnalysisButton"
                  onClick={canOpenNeural ? handleOpenNeuralModal : undefined}
                  disabled={!canOpenNeural}
                  color={neuralModalOpen ? "primary" : "default"}
                >
                  <ElectricBoltTwoToneIcon
                    style={{ transform: "rotate(60deg) scaleX(-1)" }}
                  />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}

        <BatchProcessing open={batchDialogOpen} onClose={handleCloseBatchDialog} />
      </section>

      <section className="navbar-middle">
        {project && (
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
            <Typography className="navbar__title">{project.title}</Typography>
            <Tooltip title="Capture Screenshot of Entire Window" disableInteractive arrow>
              <IconButton onClick={() => handleScreenshot(combinedComponentRef)}>
                <AddAPhotoTwoTone />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </section>

      <section className="navbar-right">
        <img
          src={WaveGuideLogo}
          alt="WaveGuide logo"
          className="wave-explorer-icon"
        />
        <h1 className="logo">aveExplorer</h1>
        <ProfileMenu profile={profile} setProfile={setProfile} />
      </section>

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

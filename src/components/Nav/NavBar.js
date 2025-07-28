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

export const NavBar = ({ combinedComponentRef, profile, setProfile }) => {
  const { project } = useContext(DataContext);
  const [wellArraysUpdated, setWellArraysUpdated] = useState(false);
  const [file, setFile] = useState(null); // State to store the uploaded file

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

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
              // style={{ fill: "rgb(0,32,96)" }}
            />
          </IconButton>
        </Tooltip>
        <FileUploader
          setWellArraysUpdated={setWellArraysUpdated}
          setFile={setFile}
        />
        {project ? (
          <>
            <NavMenu profile={profile} />
          </>
        ) : (
          ""
        )}
      </section>
      <section className="navbar-middle">
        {/* Display the file name */}
        {/* {file && <Typography>file name: {file.name}</Typography>} */}
        {project ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
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
        {/* <ProfileMenu
          profile={profile}
          setProfile={setProfile}
          
        /> */}
      </section>
    </header>
  );
};

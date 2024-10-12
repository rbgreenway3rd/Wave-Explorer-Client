import React, { useContext, useState } from "react";
import "../../styles/NavBar.css";
// import WaveGuideLogo from "../../assets/brand/WaveGuideLogo.gif"; // Import the gif file
import WaveGuideLogo from "../../../src/assets/brand/WaveGuideLogo.webp"; // Absolute path from src
import WaveGuideIcon from "../../../src/assets/brand/WaveGuideIcon.ico";
import WaveFrontLogo from "../../../src/assets/brand/WaveFrontLogo.webp";
import FileUploader from "../FileHandling/FileUploader";
import { DataContext } from "../FileHandling/DataProvider";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Drawer from "@mui/material//Drawer";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import MenuIcon from "@mui/icons-material/Menu";

export const NavMenu = () => {
  return (
    <IconButton>
      <MenuIcon />
    </IconButton>
  );
};

export default NavMenu;

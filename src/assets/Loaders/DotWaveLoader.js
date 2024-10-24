import React from "react";
import { motion } from "framer-motion";

const loadingContainer = {
  width: "8rem",
  height: "15rem",
  display: "flex",
  justifyContent: "space-around",
};

const loadingDot = {
  display: "block",
  width: "0.5rem",
  height: "0.5rem",
  backgroundColor: "rgb(75, 192, 192)",
  borderRadius: "1rem",
};

const loadingContainerVariants = {
  start: {
    transition: {
      staggerChildren: 0.05,
    },
  },
  end: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const loadingDotVariants = {
  start: {
    y: "10rem",
  },
  end: {
    y: "15rem",
  },
};

const loadingDotTransition = {
  duration: 0.5,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut",
};

export default function DotWaveLoader() {
  return (
    <motion.div
      style={loadingContainer}
      variants={loadingContainerVariants}
      initial="start"
      animate="end"
    >
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
      <motion.span
        style={loadingDot}
        variants={loadingDotVariants}
        transition={loadingDotTransition}
      />
    </motion.div>
  );
}

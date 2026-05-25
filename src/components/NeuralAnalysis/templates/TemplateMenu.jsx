import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Divider,
  ListSubheader,
  Menu,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import StorageIcon from "@mui/icons-material/Storage";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { Button, IconButton } from "../../ui";
import { useNeuralSettings } from "../NeuralProvider";
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  getTemplate,
  templateExists,
  buildTemplatePayload,
  downloadTemplateFile,
  importTemplateFromFile,
} from "./templateStorage";

// MUI Menu wrapping the dual-mode template store.
//
// Saving is split into two actions:
//   - "Save to file…"    → downloads a .json the user can keep anywhere
//                          (or share / put in version control). The
//                          default / recommended path.
//   - "Save to browser…" → persists into localStorage under the same
//                          name; convenient single-machine workflow.
//
// Loading is split into two actions:
//   - "Import from file…" → file picker, parses + applies. Doesn't
//                          persist to localStorage (the user can save
//                          to browser afterwards if they want).
//   - "Stored in browser" → existing list of localStorage templates,
//                          click to apply, × to delete.

const TemplateMenu = () => {
  const { getSettingsSnapshot, applySettingsSnapshot } = useNeuralSettings();
  const [anchorEl, setAnchorEl] = useState(null);
  const [templates, setTemplates] = useState([]);
  const fileInputRef = useRef(null);
  const open = Boolean(anchorEl);

  const refresh = useCallback(() => {
    setTemplates(listTemplates());
  }, []);

  // Re-read templates each time the menu opens so external changes
  // (e.g., a second tab) are picked up. localStorage doesn't fire
  // 'storage' events in the originating tab, so polling on open is
  // the cheapest source of truth.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const handleClose = () => setAnchorEl(null);

  const promptForName = (verb) => {
    const name = window.prompt(`${verb} current analysis settings as:`);
    if (!name) return null;
    const trimmed = name.trim();
    return trimmed || null;
  };

  const handleSaveToFile = () => {
    const name = promptForName("Save");
    handleClose();
    if (!name) return;
    try {
      downloadTemplateFile(buildTemplatePayload(name, getSettingsSnapshot()));
    } catch (err) {
      window.alert(err.message || "Failed to save template to file");
    }
  };

  const handleSaveToBrowser = () => {
    const name = promptForName("Save");
    if (!name) {
      handleClose();
      return;
    }
    if (templateExists(name)) {
      const ok = window.confirm(
        `A template named "${name}" already exists in browser storage. Overwrite?`
      );
      if (!ok) {
        handleClose();
        return;
      }
    }
    try {
      saveTemplate(name, getSettingsSnapshot());
      refresh();
    } catch (err) {
      window.alert(err.message || "Failed to save template to browser");
    }
  };

  const handleImportClick = () => {
    handleClose();
    // Defer to the next tick so the menu's close animation doesn't
    // swallow the focus that the file dialog needs.
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    // Reset input value so re-selecting the same file fires onChange
    // again the next time the user imports.
    e.target.value = "";
    if (!file) return;
    try {
      const template = await importTemplateFromFile(file);
      applySettingsSnapshot(template.settings);
    } catch (err) {
      window.alert(err.message || "Failed to import template");
    }
  };

  const handleLoad = (name) => {
    const t = getTemplate(name);
    if (!t) return;
    applySettingsSnapshot(t.settings);
    handleClose();
  };

  const handleDelete = (e, name) => {
    e.stopPropagation();
    const ok = window.confirm(`Delete template "${name}" from browser storage?`);
    if (!ok) return;
    deleteTemplate(name);
    refresh();
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Templates ▾
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: { minWidth: "15rem", maxWidth: "22rem" },
          },
        }}
      >
        <ListSubheader disableSticky sx={subheaderSx}>
          Save current settings
        </ListSubheader>
        <MenuItem onClick={handleSaveToFile} sx={iconItemSx}>
          <FileDownloadIcon fontSize="small" />
          <span>Save to file…</span>
          <span style={badgeStyle}>default</span>
        </MenuItem>
        <MenuItem onClick={handleSaveToBrowser} sx={iconItemSx}>
          <StorageIcon fontSize="small" />
          <span>Save to browser…</span>
        </MenuItem>
        <Divider />
        <ListSubheader disableSticky sx={subheaderSx}>
          Load
        </ListSubheader>
        <MenuItem onClick={handleImportClick} sx={iconItemSx}>
          <FileUploadIcon fontSize="small" />
          <span>Import from file…</span>
        </MenuItem>
        <Divider />
        <ListSubheader disableSticky sx={subheaderSx}>
          Stored in browser
        </ListSubheader>
        {templates.length === 0 ? (
          <MenuItem disabled>No saved templates</MenuItem>
        ) : (
          templates.map((t) => (
            <MenuItem
              key={t.name}
              onClick={() => handleLoad(t.name)}
              title={`Saved ${new Date(t.createdAt).toLocaleString()}`}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.name}
              </span>
              <IconButton
                variant="subtle"
                size="sm"
                aria-label={`Delete ${t.name}`}
                title="Delete template"
                onClick={(e) => handleDelete(e, t.name)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};

const subheaderSx = {
  lineHeight: "1.5rem",
  fontSize: "0.6875rem",
  textTransform: "uppercase",
  letterSpacing: "0.03125rem",
};

const iconItemSx = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

const badgeStyle = {
  marginLeft: "auto",
  padding: "0.0625rem 0.375rem",
  borderRadius: "0.625rem",
  background: "var(--color-primary, #1976d2)",
  color: "#fff",
  fontSize: "0.625rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.03125rem",
};

export default TemplateMenu;

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../ui";
import { useNeuralSettings } from "../NeuralProvider";
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  getTemplate,
  templateExists,
} from "./templateStorage";

// Compact popover that wraps the existing localStorage-backed template
// store. Opens beneath the "Templates ▾" trigger; closes on outside
// click or Escape. Three actions: Save current as new, Load, Delete.

const TemplateMenu = () => {
  const { getSettingsSnapshot, applySettingsSnapshot } = useNeuralSettings();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const wrapperRef = useRef(null);

  const refresh = useCallback(() => {
    setTemplates(listTemplates());
  }, []);

  // Re-read templates each time the popover opens so external changes
  // (e.g., a second tab) are picked up. localStorage doesn't fire
  // 'storage' events in the originating tab, so polling on open is the
  // cheapest source of truth.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSaveAsNew = () => {
    const name = window.prompt("Save current analysis settings as:");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (templateExists(trimmed)) {
      const ok = window.confirm(
        `A template named "${trimmed}" already exists. Overwrite?`
      );
      if (!ok) return;
    }
    try {
      saveTemplate(trimmed, getSettingsSnapshot());
      refresh();
    } catch (err) {
      window.alert(err.message || "Failed to save template");
    }
  };

  const handleLoad = (name) => {
    const t = getTemplate(name);
    if (!t) return;
    applySettingsSnapshot(t.settings);
    setOpen(false);
  };

  const handleDelete = (name) => {
    const ok = window.confirm(`Delete template "${name}"?`);
    if (!ok) return;
    deleteTemplate(name);
    refresh();
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Templates ▾
      </Button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 240,
            maxWidth: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "var(--color-surface, #fff)",
            border: "1px solid var(--color-border, #ccc)",
            borderRadius: 4,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 1000,
            padding: 6,
          }}
        >
          <button
            type="button"
            onClick={handleSaveAsNew}
            style={menuItemStyle}
          >
            Save current as new…
          </button>
          <div style={dividerStyle} />
          <div style={sectionHeaderStyle}>Load</div>
          {templates.length === 0 ? (
            <div style={emptyStyle}>No saved templates</div>
          ) : (
            templates.map((t) => (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleLoad(t.name)}
                  style={{ ...menuItemStyle, flex: 1 }}
                  title={`Saved ${new Date(t.createdAt).toLocaleString()}`}
                >
                  {t.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.name)}
                  aria-label={`Delete ${t.name}`}
                  title="Delete"
                  style={deleteButtonStyle}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const menuItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "6px 10px",
  background: "transparent",
  border: "none",
  borderRadius: 3,
  cursor: "pointer",
  font: "inherit",
  color: "var(--color-text, #222)",
};

const dividerStyle = {
  height: 1,
  background: "var(--color-border, #ddd)",
  margin: "4px 0",
};

const sectionHeaderStyle = {
  padding: "4px 10px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--color-text-muted, #888)",
};

const emptyStyle = {
  padding: "6px 10px",
  color: "var(--color-text-muted, #888)",
  fontStyle: "italic",
  fontSize: 13,
};

const deleteButtonStyle = {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  borderRadius: 3,
  cursor: "pointer",
  fontSize: 16,
  color: "var(--color-text-muted, #888)",
};

export default TemplateMenu;

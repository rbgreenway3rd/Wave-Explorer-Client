import React, { useEffect, useMemo, useRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Modal, IconButton, Button } from "../../ui";
import CollapsibleSection from "../subComponents/CollapsibleSection";
import { DOC_GROUPS, DOC_SECTIONS } from "./neuralDocsContent";
import "./NeuralDocsModal.css";

/**
 * NeuralDocsModal — interactive, plain-language documentation for the
 * Neural Analysis modal. Explains each pipeline step and control in
 * expandable sections, for users who aren't fluent in math/data
 * analytics.
 *
 * Props:
 *   open               — visibility
 *   onClose            — close handler
 *   initialSectionId   — optional doc section id to open + scroll to
 *                        (controls deep-link here via a [?] icon, e.g.
 *                        "param-prominence"). null → opens at the top.
 *
 * Content lives in neuralDocsContent.js; this component only renders it.
 */

// Order + labels for the per-section content blocks.
const BLOCK_ORDER = ["what", "why", "analogy", "ifWrong"];
const BLOCK_LABELS = {
  what: "What it does",
  why: "Why it matters",
  analogy: "In plain terms",
  ifWrong: "If it's set wrong",
};

function matchesQuery(section, q) {
  if (!q) return true;
  const hay = [section.title, ...BLOCK_ORDER.map((k) => section[k] || "")]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

const NeuralDocsModal = ({ open, onClose, initialSectionId = null }) => {
  const [query, setQuery] = useState("");
  // Manual expand state (id -> bool). When searching, matches auto-expand
  // and this is bypassed.
  const [expanded, setExpanded] = useState({});
  const bodyRef = useRef(null);

  // On (re)open or deep-link change: clear search, expand the target.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setExpanded(initialSectionId ? { [initialSectionId]: true } : {});
  }, [open, initialSectionId]);

  // Scroll the deep-linked section into view once it's rendered/expanded.
  useEffect(() => {
    if (!open || !initialSectionId) return;
    const raf = requestAnimationFrame(() => {
      const el = bodyRef.current?.querySelector(
        `[data-doc-id="${initialSectionId}"]`
      );
      if (el) el.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, initialSectionId]);

  const q = query.trim().toLowerCase();

  const visibleByGroup = useMemo(() => {
    const map = {};
    for (const group of DOC_GROUPS) map[group.id] = [];
    for (const section of DOC_SECTIONS) {
      if (matchesQuery(section, q) && map[section.group]) {
        map[section.group].push(section);
      }
    }
    return map;
  }, [q]);

  const hasResults = DOC_GROUPS.some(
    (g) => (visibleByGroup[g.id] || []).length > 0
  );

  // While searching, every match is expanded; otherwise honor manual state.
  const isExpanded = (id) => (q ? true : !!expanded[id]);
  const toggle = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      className="neural-docs-modal"
    >
      <Modal.Header className="neural-docs-modal__header">
        <span className="neural-docs-modal__title">
          How the Neural Analysis works
        </span>
        <IconButton aria-label="Close documentation" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Modal.Header>

      <Modal.Body className="neural-docs-modal__body">
        <div ref={bodyRef} className="neural-docs-modal__scroll">
          <input
            type="search"
            className="neural-docs-modal__search"
            placeholder="Search the documentation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search documentation"
          />

          {DOC_GROUPS.map((group) => {
            const sections = visibleByGroup[group.id] || [];
            if (sections.length === 0) return null;
            return (
              <section key={group.id} className="neural-docs-modal__group">
                <h4 className="neural-docs-modal__group-title">
                  {group.title}
                </h4>
                {sections.map((section) => (
                  <div key={section.id} data-doc-id={section.id}>
                    <CollapsibleSection
                      title={
                        <span className="neural-docs-modal__section-title">
                          {section.title}
                          {section.status === "planned" && (
                            <span className="neural-docs-modal__badge">
                              Planned
                            </span>
                          )}
                        </span>
                      }
                      expanded={isExpanded(section.id)}
                      onToggle={() => toggle(section.id)}
                    >
                      <div className="neural-docs-modal__content">
                        {BLOCK_ORDER.map((key) =>
                          section[key] ? (
                            <p
                              key={key}
                              className="neural-docs-modal__block"
                            >
                              <span className="neural-docs-modal__block-label">
                                {BLOCK_LABELS[key]}
                              </span>
                              {section[key]}
                            </p>
                          ) : null
                        )}
                      </div>
                    </CollapsibleSection>
                  </div>
                ))}
              </section>
            );
          })}

          {!hasResults && (
            <p className="neural-docs-modal__empty">
              No matches for "{query}".
            </p>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" size="sm" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NeuralDocsModal;

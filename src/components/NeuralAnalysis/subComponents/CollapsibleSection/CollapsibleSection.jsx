import React from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import "./CollapsibleSection.css";

/**
 * CollapsibleSection — accordion section for the modal's right column.
 *
 * Each section renders a clickable header strip; when expanded, the
 * body renders below it. Multiple sections may be open simultaneously
 * (Wells + Results today; Funnel and Peak Inspector added in later
 * phases of the Decision Explanation Layer).
 *
 * Flex behavior is opt-in per-section via `growWhenExpanded`:
 *   - default (false) — section sits at natural height when expanded,
 *     used for fixed-size grids like the WellSelector.
 *   - true — when expanded, the section grows to fill remaining column
 *     space and the body owns `overflow-y: auto`. Used for the long
 *     scrollable Results panel and (later) for the Funnel/Inspector
 *     panels whose content can exceed the viewport.
 *
 * Collapsed state always renders only the header at natural height.
 */
const CollapsibleSection = ({
  title,
  expanded,
  onToggle,
  growWhenExpanded = false,
  headerRight = null,
  children,
  className = "",
}) => {
  const wrapperClass = [
    "neural-collapsible-section",
    expanded ? "neural-collapsible-section--expanded" : "neural-collapsible-section--collapsed",
    expanded && growWhenExpanded
      ? "neural-collapsible-section--grow"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        className="neural-collapsible-section__header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="neural-collapsible-section__chevron" aria-hidden="true">
          {expanded ? (
            <KeyboardArrowDownIcon fontSize="small" />
          ) : (
            <KeyboardArrowRightIcon fontSize="small" />
          )}
        </span>
        <span className="neural-collapsible-section__title">{title}</span>
        {headerRight && (
          <span className="neural-collapsible-section__header-right">
            {headerRight}
          </span>
        )}
      </button>
      {expanded && (
        <div className="neural-collapsible-section__body">{children}</div>
      )}
    </div>
  );
};

export default CollapsibleSection;

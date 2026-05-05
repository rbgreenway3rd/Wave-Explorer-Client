import { useCallback, useEffect, useState } from "react";

/**
 * useDraftSlider — local-state wrapper for an MUI Slider whose `value`
 * is otherwise driven by an expensive setter (e.g. one that re-runs the
 * neural-analysis pipeline on every commit).
 *
 * Without this hook, controlled sliders that fire on every onChange will
 * either:
 *   - re-run the pipeline on every pixel of drag (10–30 s freeze for
 *     large signals), OR
 *   - if you swap onChange→onChangeCommitted, the thumb won't move
 *     during drag at all because `value` never updates.
 *
 * With it, the slider tracks a local `draft` during drag (cheap, no
 * pipeline re-run) and commits the final value to the expensive setter
 * once on release.
 *
 * Usage:
 *
 *   const { value, onChange, onChangeCommitted } = useDraftSlider(
 *     spikeProminence,
 *     setSpikeProminence
 *   );
 *
 *   <Slider value={value} onChange={onChange} onChangeCommitted={onChangeCommitted} />
 *
 * Notes:
 * - The local draft is re-synced whenever `external` changes outside of
 *   our own commit (e.g., when "Reset to suggested" runs).
 * - Both event handlers ignore the first `event` arg as a convenience
 *   (matches MUI's handler shape).
 */
export function useDraftSlider(external, commit) {
  const [draft, setDraft] = useState(external);

  // Sync external → draft whenever the upstream value changes (e.g.,
  // selecting a different well, hitting Reset, programmatic update).
  useEffect(() => {
    setDraft(external);
  }, [external]);

  const onChange = useCallback((_event, value) => {
    setDraft(value);
  }, []);

  const onChangeCommitted = useCallback(
    (_event, value) => {
      commit(value);
    },
    [commit]
  );

  return { value: draft, onChange, onChangeCommitted };
}

export default useDraftSlider;

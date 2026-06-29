/**
 * Template persistence for the neural settings added this cycle:
 *   - controlScalingEnabled / neuralNormalizationEnabled (PERSISTABLE_KEYS)
 *   - the control-well SET, stored as positional keys ("A1") at the top
 *     level (not in `settings`, which sanitizeSettings would strip).
 */

import {
  PERSISTABLE_KEYS,
  buildTemplatePayload,
  saveTemplate,
  getTemplate,
  deleteTemplate,
} from "../templateStorage";

describe("template persistence — new neural settings", () => {
  test("new toggles are in PERSISTABLE_KEYS", () => {
    expect(PERSISTABLE_KEYS).toContain("controlScalingEnabled");
    expect(PERSISTABLE_KEYS).toContain("neuralNormalizationEnabled");
  });

  test("buildTemplatePayload keeps the toggles + control well keys", () => {
    const settings = {
      controlScalingEnabled: true,
      neuralNormalizationEnabled: true,
      spikeProminence: 0.1, // fraction
      notAKnob: 999, // not persistable → stripped
    };
    const payload = buildTemplatePayload("t", settings, ["A1", "B2", 7]);
    expect(payload.settings.controlScalingEnabled).toBe(true);
    expect(payload.settings.neuralNormalizationEnabled).toBe(true);
    expect(payload.settings.spikeProminence).toBe(0.1);
    expect(payload.settings.notAKnob).toBeUndefined();
    // Control well keys live at the top level, sanitized to strings.
    expect(payload.controlWellKeys).toEqual(["A1", "B2"]);
  });

  test("saveTemplate → getTemplate round-trips control well keys", () => {
    saveTemplate("__rt_test__", { controlScalingEnabled: true }, ["C3", "C4"]);
    const t = getTemplate("__rt_test__");
    expect(t.settings.controlScalingEnabled).toBe(true);
    expect(t.controlWellKeys).toEqual(["C3", "C4"]);
    deleteTemplate("__rt_test__");
  });

  test("missing control well keys → empty array (back-compat)", () => {
    expect(buildTemplatePayload("t", {}).controlWellKeys).toEqual([]);
  });
});

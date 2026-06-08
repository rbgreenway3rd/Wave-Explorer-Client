// CSV row serializer for the neural report builder.
//
// Both report writers used to interpolate fields with template strings,
// which broke immediately on any field containing a comma (project
// names like "Acme, Inc.", protocols with commas, ROI labels), a
// double-quote, or a newline. This module is the only sanctioned way
// to emit a CSV row from the report builder.
//
// Behavior follows RFC 4180:
//   - A field containing `,`, `"`, `\r`, or `\n` is wrapped in double
//     quotes and any `"` inside is escaped as `""`.
//   - Otherwise the field is emitted as-is.
//   - null / undefined are written as the empty string. NaN is written
//     as "N/A" (matches the existing `formatMetric` convention so
//     downstream parsers handle it identically).
//   - Numbers are coerced via String(); the caller is responsible for
//     rounding/precision via formatMetric or its own toFixed.

const NEEDS_QUOTING = /[",\r\n]/;

function serializeField(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "N/A";
    return String(value);
  }
  const str = typeof value === "string" ? value : String(value);
  if (!NEEDS_QUOTING.test(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Serialize one CSV row from an array of field values.
 * Returns the row WITHOUT a trailing newline — the report writer joins
 * rows with "\n" itself to keep control of line endings.
 *
 * @param {Array<string|number|null|undefined>} fields
 * @returns {string}
 */
export function serializeCsvRow(fields) {
  if (!Array.isArray(fields)) return "";
  return fields.map(serializeField).join(",");
}

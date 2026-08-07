// ServiceNow's Table API returns reference fields (and, on this instance,
// several other field types too) as { value, display_value, link } objects
// rather than plain strings. Every page that renders records straight from
// the API needs to unwrap that shape the same way, or the object silently
// stringifies to "[object Object]" (e.g. Team, Challenge, User, Level).
//
// display_value is preferred here because these helpers back list/card
// views meant for people to read — the raw sys_id in `value` isn't useful
// there. Routes that need the raw sys_id (lookup, schema) already extract
// `.value` themselves and are untouched by this.
export function asDisplayString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (obj.display_value != null && obj.display_value !== "") {
      return String(obj.display_value);
    }
    if ("value" in obj) {
      return obj.value == null ? "" : String(obj.value);
    }
  }
  return v == null ? "" : String(v);
}

// Normalize every field on every row to a plain display string, so the rest
// of a page can safely treat every record as Record<string, string>.
export function normalizeRecords(
  rows: Record<string, unknown>[]
): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = asDisplayString(v);
    }
    return out;
  });
}

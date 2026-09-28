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

// Reference fields come back as { value: <sys_id>, display_value, link }, and
// the link names the table the reference points at:
//   https://<instance>/api/now/table/sys_user/<sys_id>
// Flattening to a display string loses that, which would make every
// "Player" or "Challenge" cell a dead end. So the target survives as a
// hidden sibling column, "sys_ref_<field>" = "<table>/<sys_id>". The sys_
// prefix means every screen already treats it as bookkeeping and never
// renders it; recordRef() reads it back.
const REF_LINK_PATTERN = /\/api\/now\/table\/([a-z0-9_]+)\/([a-f0-9]{32})/i;

export const REF_PREFIX = "sys_ref_";

export function refFromField(v: unknown): { table: string; sysId: string } | null {
  if (!v || typeof v !== "object") return null;
  const obj = v as Record<string, unknown>;
  const match = typeof obj.link === "string" ? obj.link.match(REF_LINK_PATTERN) : null;
  return match ? { table: match[1], sysId: match[2] } : null;
}

/** The record a reference column points at, if it points at one. */
export function recordRef(
  record: Record<string, string>,
  field: string
): { table: string; sysId: string } | null {
  const raw = record[`${REF_PREFIX}${field}`];
  if (!raw) return null;
  const [table, sysId] = raw.split("/");
  return table && sysId ? { table, sysId } : null;
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

      const ref = refFromField(v);
      if (ref) out[`${REF_PREFIX}${k}`] = `${ref.table}/${ref.sysId}`;
    }

    // A record's own id must be the raw sys_id, never a display string.
    const id = row.sys_id;
    if (id && typeof id === "object" && "value" in (id as object)) {
      out.sys_id = String((id as { value: unknown }).value ?? "");
    }
    return out;
  });
}

/** One field of a single record as /api/record returns it. */
export type RecordField = {
  key: string;
  /** The dictionary's own label for the column, when it could be read. */
  label: string;
  type: string;
  mandatory: boolean;
  value: string;
  display: string;
  /** Set on reference fields: the record this field points at. */
  ref?: { table: string; sysId: string };
};

import { NextRequest } from "next/server";
import { snTableGet } from "@/lib/servicenow";

// Some instances resolve fields to { value, display_value } objects even
// without sysparm_display_value=true — coerce defensively everywhere.
function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return String((v as { value: unknown }).value ?? "");
  }
  return v == null ? "" : String(v);
}

type DictField = { element: string; type: string; reference: string; isDisplay: boolean };

async function getTableFields(table: string): Promise<DictField[]> {
  const dictResult = await snTableGet<Record<string, unknown>>("sys_dictionary", {
    sysparm_query: `name=${table}^elementISNOTEMPTY^ORDERBYelement`,
    sysparm_fields: "element,internal_type.name,reference,display",
    sysparm_display_value: "false",
    sysparm_limit: "200",
  });

  return (dictResult.result ?? [])
    .map((r) => ({
      element: asString(r.element),
      type: asString(r["internal_type.name"]),
      reference: asString(r.reference),
      isDisplay: asString(r.display) === "true",
    }))
    .filter((f) => f.element && !f.element.startsWith("sys_"));
}

// If the chosen field is itself a reference field, its raw value is just a
// sys_id — dot-walk into the referenced record's own display field instead
// of returning the reference field as-is. "name" covers the large majority
// of ServiceNow tables, including sys_user, so it's used as the default
// target rather than trying to resolve the referenced table's own display
// field (which would mean yet another dictionary round trip).
function resolveField(f: DictField): string {
  if (f.type === "reference" && f.reference) {
    return `${f.element}.name`;
  }
  return f.element;
}

const SYS_ID_PATTERN = /^[a-f0-9]{32}$/i;

// Last resort when the dictionary doesn't point to anything usable: pull
// one real record and pick the first field that actually looks like
// readable text rather than a raw sys_id.
async function inferDisplayFieldFromSample(table: string): Promise<string> {
  try {
    const sample = await snTableGet<Record<string, unknown>>(table, {
      sysparm_limit: "1",
      sysparm_display_value: "false",
    });
    const record = sample.result?.[0];
    if (!record) return "";

    for (const [key, raw] of Object.entries(record)) {
      if (key === "sys_id" || key.startsWith("sys_")) continue;
      const value = asString(raw);
      if (!value) continue;
      if (SYS_ID_PATTERN.test(value)) continue;
      if (value === "true" || value === "false") continue;
      if (/^-?\d+(\.\d+)?$/.test(value)) continue;
      return key;
    }
  } catch {
    // Fall through to sys_id.
  }
  return "";
}

// Small in-memory cache so repeated keystrokes in the same table's
// reference picker don't re-query sys_dictionary every time.
const displayFieldCache = new Map<string, string>();

async function getDisplayField(table: string): Promise<string> {
  const cached = displayFieldCache.get(table);
  if (cached) return cached;

  const fields = await getTableFields(table);
  let resolved = "";

  // 1. Whatever the dictionary explicitly marks as the display value.
  const displayField = fields.find((f) => f.isDisplay);
  if (displayField) resolved = resolveField(displayField);

  // 2. Common display-ish field names, in priority order.
  if (!resolved) {
    const candidates = ["name", "short_description", "title", "u_name", "number"];
    for (const c of candidates) {
      const match = fields.find((f) => f.element === c);
      if (match) {
        resolved = resolveField(match);
        break;
      }
    }
  }

  // 3. A reference field pointing at sys_user (common for "player"-style
  // wrapper tables with no display field of their own).
  if (!resolved) {
    const userRef = fields.find((f) => f.type === "reference" && f.reference === "sys_user");
    if (userRef) resolved = `${userRef.element}.name`;
  }

  // 4. Pull a real record and pick whatever looks like readable text.
  if (!resolved) {
    resolved = await inferDisplayFieldFromSample(table);
  }

  resolved = resolved || "sys_id";
  displayFieldCache.set(table, resolved);
  return resolved;
}

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table") ?? "";
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    return Response.json({ error: "Invalid table name." }, { status: 400 });
  }

  try {
    const displayField = await getDisplayField(table);
    // Strip the ServiceNow query segment separator so free text can't
    // break out of the LIKE clause.
    const safeTerm = q.replace(/\^/g, "");

    const query = safeTerm
      ? `${displayField}LIKE${safeTerm}^ORDERBY${displayField}`
      : `ORDERBY${displayField}`;

    const data = await snTableGet<Record<string, unknown>>(table, {
      sysparm_query: query,
      sysparm_fields: `sys_id,${displayField}`,
      sysparm_display_value: "false",
      sysparm_limit: "10",
    });

    const options = (data.result ?? []).map((r) => {
      const sysId = asString(r.sys_id);
      const label = asString(r[displayField]);
      return { sys_id: sysId, label: label || sysId };
    });

    return Response.json({ result: options });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Unknown error contacting ServiceNow.",
      },
      { status: 502 }
    );
  }
}

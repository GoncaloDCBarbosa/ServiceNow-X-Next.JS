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

// Small in-memory cache so repeated keystrokes in the same table's
// reference picker don't re-query sys_dictionary every time.
const displayFieldCache = new Map<string, string>();

async function getDisplayField(table: string): Promise<string> {
  const cached = displayFieldCache.get(table);
  if (cached) return cached;

  const data = await snTableGet<Record<string, unknown>>("sys_dictionary", {
    sysparm_query: `name=${table}^display=true`,
    sysparm_fields: "element",
    sysparm_display_value: "false",
    sysparm_limit: "1",
  });

  const field = asString(data.result?.[0]?.element) || "sys_id";
  displayFieldCache.set(table, field);
  return field;
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

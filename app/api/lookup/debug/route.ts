import { NextRequest } from "next/server";
import { snTableGet } from "@/lib/servicenow";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return String((v as { value: unknown }).value ?? "");
  }
  return v == null ? "" : String(v);
}

// Diagnostic-only route: shows exactly what /api/lookup sees for a table —
// its dictionary rows and a raw sample record — so a display-field bug can
// be fixed from real data instead of another guess.
export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table") ?? "";
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    return Response.json({ error: "Invalid table name." }, { status: 400 });
  }

  try {
    const dictResult = await snTableGet<Record<string, unknown>>("sys_dictionary", {
      sysparm_query: `name=${table}^elementISNOTEMPTY^ORDERBYelement`,
      sysparm_fields: "element,column_label,internal_type,internal_type.name,reference,display",
      sysparm_display_value: "false",
      sysparm_limit: "200",
    });

    const dictionary = (dictResult.result ?? [])
      .filter((r) => !asString(r.element).startsWith("sys_"))
      .map((r) => ({
        element: asString(r.element),
        label: asString(r.column_label),
        internal_type_raw: asString(r.internal_type),
        internal_type_name: asString(r["internal_type.name"]),
        reference: asString(r.reference),
        display: asString(r.display),
      }));

    const sampleResult = await snTableGet<Record<string, unknown>>(table, {
      sysparm_limit: "1",
      sysparm_display_value: "false",
    });
    const rawSample = sampleResult.result?.[0] ?? {};
    const sample: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawSample)) {
      sample[k] = asString(v);
    }

    return Response.json({ table, dictionary, sample });
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

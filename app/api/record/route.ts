import { NextRequest } from "next/server";
import { snTableGet } from "@/lib/servicenow";
import { TABLES, PERSON_FIELDS, isBrowsableTable, isSystemField } from "@/lib/domain";
import { refFromField, type RecordField } from "@/lib/sn-format";

/**
 * One record, in full, for the record loader page.
 *
 * Returns the record's fields as an ordered list — each with its label,
 * type, plain and display values, and (for references) the record it points
 * at — so the page can lay it out like a ServiceNow form without knowing
 * anything about the table in advance.
 */

const SYS_ID_PATTERN = /^[a-f0-9]{32}$/i;

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return String((v as { value: unknown }).value ?? "");
  }
  return v == null ? "" : String(v);
}

type Meta = { label: string; type: string; mandatory: boolean; maxLength: number };

/** Column labels, types and flags from the table's own dictionary entry. */
async function readMeta(table: string): Promise<Record<string, Meta>> {
  const meta: Record<string, Meta> = {};
  try {
    const dict = await snTableGet<Record<string, unknown>>("sys_dictionary", {
      sysparm_query: `name=${table}^elementISNOTEMPTY`,
      sysparm_fields: "element,column_label,internal_type.name,mandatory,max_length",
      sysparm_display_value: "false",
      sysparm_limit: "200",
    });

    for (const row of dict.result ?? []) {
      const element = asString(row.element);
      if (!element) continue;
      meta[element] = {
        label: asString(row.column_label),
        type: asString(row["internal_type.name"]) || "string",
        mandatory: asString(row.mandatory) === "true",
        maxLength: Number(asString(row.max_length)) || 0,
      };
    }
  } catch {
    // The dictionary is a nicety. Without it the page falls back to the
    // record's own shape and humanised labels.
  }
  return meta;
}

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table") ?? "";
  const sysId = req.nextUrl.searchParams.get("sys_id") ?? "";

  if (!isBrowsableTable(table)) {
    return Response.json({ error: "That kind of record can't be opened here." }, { status: 400 });
  }
  if (!SYS_ID_PATTERN.test(sysId)) {
    return Response.json({ error: "That isn't a valid record reference." }, { status: 400 });
  }

  try {
    const params: Record<string, string> = {
      sysparm_query: `sys_id=${sysId}`,
      sysparm_limit: "1",
      // "all" gives value AND display_value AND the reference link, which is
      // how the page knows both what to show and where a reference leads.
      sysparm_display_value: "all",
    };
    // People are read through an allow-list — never the whole user row.
    if (table === TABLES.user) params.sysparm_fields = ["sys_id", ...PERSON_FIELDS].join(",");

    const [data, meta] = await Promise.all([
      snTableGet<Record<string, unknown>>(table, params),
      readMeta(table),
    ]);

    const record = data.result?.[0];
    if (!record) {
      return Response.json({ error: "That record no longer exists." }, { status: 404 });
    }

    const fields: RecordField[] = Object.entries(record)
      .filter(([key]) => !isSystemField(key))
      .map(([key, raw]) => {
        const m = meta[key];
        const long = !!m && (m.maxLength > 255 || /^(html|journal|journal_input|translated_html)$/.test(m.type));
        return {
          key,
          label: m?.label ?? "",
          type: long ? "text" : (m?.type ?? "string"),
          mandatory: m?.mandatory ?? false,
          value: asString(raw),
          display:
            raw && typeof raw === "object" && (raw as Record<string, unknown>).display_value != null
              ? String((raw as Record<string, unknown>).display_value)
              : asString(raw),
          ref: refFromField(raw) ?? undefined,
        };
      });

    return Response.json({ result: { table, sys_id: sysId, fields } });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error contacting ServiceNow." },
      { status: 502 }
    );
  }
}

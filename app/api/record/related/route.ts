import { NextRequest } from "next/server";
import { snTableGet } from "@/lib/servicenow";
import { isBrowsableTable } from "@/lib/domain";

/**
 * Records that point at this one — what ServiceNow shows as a form's related
 * lists. Found from the dictionary (every programme table with a reference
 * column to this table), so a new table that references challenges, players
 * or teams shows up on their pages without a code change.
 */

const SYS_ID_PATTERN = /^[a-f0-9]{32}$/i;
type RelatedList = {
  table: string;
  field: string;
  rows: Record<string, unknown>[];
  more: boolean;
  failed?: boolean;
};

const PER_LIST = 25;
const MAX_LISTS = 8;

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return String((v as { value: unknown }).value ?? "");
  }
  return v == null ? "" : String(v);
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
    const dict = await snTableGet<Record<string, unknown>>("sys_dictionary", {
      sysparm_query: `reference=${table}^internal_type.name=reference^nameSTARTSWITHx_trhrt_^ORDERBYname`,
      sysparm_fields: "name,element",
      sysparm_display_value: "false",
      sysparm_limit: "50",
    });

    const relations = (dict.result ?? [])
      .map((r) => ({ table: asString(r.name), field: asString(r.element) }))
      .filter((r) => r.table && r.field && isBrowsableTable(r.table))
      .slice(0, MAX_LISTS);

    const lists: RelatedList[] = await Promise.all(
      relations.map(async (relation): Promise<RelatedList> => {
        try {
          const data = await snTableGet<Record<string, unknown>>(relation.table, {
            sysparm_query: `${relation.field}=${sysId}^ORDERBYDESCsys_created_on`,
            sysparm_display_value: "all",
            sysparm_limit: String(PER_LIST + 1),
          });
          const rows = data.result ?? [];
          return { ...relation, rows: rows.slice(0, PER_LIST), more: rows.length > PER_LIST };
        } catch {
          // One unreadable list shouldn't take the others down with it.
          return { ...relation, rows: [], more: false, failed: true };
        }
      })
    );

    return Response.json({ result: lists.filter((l) => l.rows.length > 0 || l.failed) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error contacting ServiceNow." },
      { status: 502 }
    );
  }
}

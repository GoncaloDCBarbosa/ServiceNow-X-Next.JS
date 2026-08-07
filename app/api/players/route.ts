import { NextRequest } from "next/server";
import { snTableGet } from "@/lib/servicenow";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "200";

  try {
    // Field names on this table aren't hardcoded (unlike sys_user) — the
    // shape isn't known ahead of time, so every field comes back and the
    // page figures out columns dynamically.
    const data = await snTableGet("x_trhrt_trh_plus_player", {
      sysparm_limit: limit,
      sysparm_query: "ORDERBYDESCsys_created_on",
      // Reference fields (user, team, level) otherwise come back as a bare
      // sys_id with no label — "all" guarantees a display_value alongside
      // it for every field, which the page then reads.
      sysparm_display_value: "all",
    });

    return Response.json(data);
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

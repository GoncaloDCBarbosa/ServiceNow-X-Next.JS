import { NextRequest } from "next/server";
import { snTableGet, snTablePost } from "@/lib/servicenow";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";

  try {
    const data = await snTableGet("x_trhrt_trh_plus_challenge_instance", {
      sysparm_limit: limit,
      sysparm_query: "ORDERBYDESCsys_created_on",
      // Reference fields (challenge, team, player) otherwise come back as a
      // bare sys_id with no label — "all" guarantees a display_value
      // alongside it for every field, which the page then reads.
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

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "Request body must be a JSON object of field values." },
      { status: 400 }
    );
  }

  // Only forward non-empty string values, so ServiceNow applies its own
  // defaults for anything the person left blank.
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim() !== "") {
      fields[key] = value;
    }
  }

  if (Object.keys(fields).length === 0) {
    return Response.json({ error: "Provide at least one field." }, { status: 400 });
  }

  try {
    const data = await snTablePost("x_trhrt_trh_plus_challenge_instance", fields);
    return Response.json(data, { status: 201 });
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

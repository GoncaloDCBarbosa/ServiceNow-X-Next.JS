import { NextRequest } from "next/server";
import { snTableGet } from "@/lib/servicenow";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";

  try {
    const data = await snTableGet("x_trhrt_trh_plus_challenge", {
      sysparm_limit: limit,
      sysparm_query: "ORDERBYDESCsys_created_on",
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

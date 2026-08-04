import { NextRequest } from "next/server";
import { snTableGet } from "@/lib/servicenow";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "100";

  try {
    const data = await snTableGet("sys_user", {
      sysparm_limit: limit,
      sysparm_fields: "sys_id,name,user_name,email,active,title",
      sysparm_query: "ORDERBYname",
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

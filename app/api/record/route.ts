import { NextRequest } from "next/server";
import { snTableGet } from "@/lib/servicenow";

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table") ?? "";
  const sysId = req.nextUrl.searchParams.get("sys_id") ?? "";

  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    return Response.json({ error: "Invalid table name." }, { status: 400 });
  }
  if (!/^[a-f0-9]{32}$/i.test(sysId)) {
    return Response.json({ error: "Invalid sys_id." }, { status: 400 });
  }

  try {
    const data = await snTableGet<Record<string, string>>(table, {
      sysparm_query: `sys_id=${sysId}`,
      sysparm_limit: "1",
    });

    const record = data.result?.[0];
    if (!record) {
      return Response.json({ error: "Record not found." }, { status: 404 });
    }

    return Response.json({ result: record });
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

import { snTableGet } from "@/lib/servicenow";
import { PERSON_FIELDS, TABLES } from "@/lib/domain";

/**
 * The profile of whoever the console is signed in to ServiceNow as: their
 * person record, the player profile linked to it (if any), and that
 * player's challenge instances.
 */

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return String((v as { value: unknown }).value ?? "");
  }
  return v == null ? "" : String(v);
}

export async function GET() {
  const account = process.env.SN_USER;
  if (!account) {
    return Response.json(
      { error: "ServiceNow connection is not configured. Set SN_USER in .env.local." },
      { status: 500 }
    );
  }

  // Encoded-query separators can't be smuggled in through the account name.
  const safeAccount = account.replace(/[\^]/g, "");

  try {
    const people = await snTableGet<Record<string, unknown>>(TABLES.user, {
      sysparm_query: `user_name=${safeAccount}^ORemail=${safeAccount}`,
      sysparm_fields: ["sys_id", ...PERSON_FIELDS].join(","),
      sysparm_display_value: "all",
      sysparm_limit: "1",
    });

    const user = people.result?.[0];
    if (!user) {
      return Response.json(
        { error: "The ServiceNow account this console uses has no person record." },
        { status: 404 }
      );
    }

    const userId = asString(user.sys_id);

    const players = await snTableGet<Record<string, unknown>>(TABLES.player, {
      sysparm_query: `user=${userId}`,
      sysparm_display_value: "all",
      sysparm_limit: "1",
    });
    const player = players.result?.[0] ?? null;

    let participations: Record<string, unknown>[] = [];
    if (player) {
      const runs = await snTableGet<Record<string, unknown>>(TABLES.participation, {
        sysparm_query: `player=${asString(player.sys_id)}^ORDERBYDESCsys_created_on`,
        sysparm_display_value: "all",
        sysparm_limit: "200",
      });
      participations = runs.result ?? [];
    }

    return Response.json({ result: { user, player, participations } });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error contacting ServiceNow." },
      { status: 502 }
    );
  }
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { normalizeRecords } from "@/lib/sn-format";

type Player = Record<string, string>;
type PageState = "loading" | "ready" | "error";

const HIDDEN_FIELDS = new Set([
  "sys_id",
  "sys_created_by",
  "sys_created_on",
  "sys_updated_by",
  "sys_updated_on",
  "sys_mod_count",
  "sys_tags",
  "sys_class_name",
  "sys_domain",
  "sys_domain_path",
  "sys_package",
  "sys_policy",
  "sys_scope",
]);

function formatColumnLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// ServiceNow "duration" fields are stored as a full timestamp pinned to the
// 1970-01-01 epoch — only the HH:MM:SS part is meaningful, so strip the date.
const SN_DURATION_PATTERN = /^1970-01-01 (\d{2}:\d{2}:\d{2})$/;

function formatCellValue(value: string) {
  const match = value.match(SN_DURATION_PATTERN);
  if (match) return match[1];
  if (value === "true") return "true";
  if (value === "false") return "false";
  return value;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<PageState>("loading");
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/players?limit=200")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPlayers(normalizeRecords(data.result ?? []));
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Request failed.");
        setStatus("error");
      });
  }, []);

  // The table's own field names aren't known ahead of time — the columns
  // to show come from whatever the first loaded record actually has.
  const columns = useMemo(() => {
    if (players.length === 0) return [];
    return Object.keys(players[0]).filter((k) => !HIDDEN_FIELDS.has(k));
  }, [players]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      columns.some((c) => (p[c] || "").toLowerCase().includes(q))
    );
  }, [players, columns, query]);

  return (
    <>
      <SiteHeader back={{ href: "/", label: "Console" }} />

      <main className="container" style={{ paddingBottom: 80 }}>
        <section style={{ marginBottom: 24 }}>
          <p className="eyebrow mono" style={{ marginBottom: 10 }}>
            x_trhrt_trh_plus_player
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 8 }}>
            Players
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            {status === "ready"
              ? `${filtered.length} of ${players.length} shown.`
              : "Loading records from ServiceNow…"}
          </p>
        </section>

        {status === "ready" && players.length > 0 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all fields…"
            className="mono"
            style={{
              width: "100%",
              maxWidth: 360,
              marginBottom: 20,
              padding: "10px 12px",
              background: "var(--panel)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              color: "var(--paper)",
              fontSize: 13,
              outline: "none",
            }}
          />
        )}

        {status === "loading" && (
          <div className="panel" style={{ padding: 24 }}>
            <p className="mono" style={{ color: "var(--muted)", fontSize: 13 }}>
              Connecting to ServiceNow…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="panel" style={{ padding: 24, borderColor: "var(--bad)" }}>
            <p className="mono" style={{ color: "var(--bad)", marginBottom: 6, fontSize: 13 }}>
              Couldn&apos;t load players
            </p>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>{error}</p>
          </div>
        )}

        {status === "ready" && players.length === 0 && (
          <div className="panel" style={{ padding: 24 }}>
            <p style={{ color: "var(--muted)" }}>No players found in x_trhrt_trh_plus_player.</p>
          </div>
        )}

        {status === "ready" && filtered.length === 0 && players.length > 0 && (
          <div className="panel" style={{ padding: 24 }}>
            <p style={{ color: "var(--muted)" }}>No players match &ldquo;{query}&rdquo;.</p>
          </div>
        )}

        {status === "ready" && filtered.length > 0 && (
          <div className="panel" style={{ overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{formatColumnLabel(c)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.sys_id ?? i}>
                    {columns.map((c) => (
                      <td key={c} className={c.endsWith("_id") || c === "sys_id" ? "mono" : undefined}>
                        {p[c] ? formatCellValue(p[c]) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

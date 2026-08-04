"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";

type SnUser = Record<string, string>;
type PageState = "loading" | "ready" | "error";

export default function UsersPage() {
  const [users, setUsers] = useState<SnUser[]>([]);
  const [status, setStatus] = useState<PageState>("loading");
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/users?limit=200")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUsers(data.result ?? []);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Request failed.");
        setStatus("error");
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.user_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <>
      <SiteHeader back={{ href: "/", label: "Console" }} />

      <main className="container" style={{ paddingBottom: 80 }}>
        <section style={{ marginBottom: 24 }}>
          <p className="eyebrow mono" style={{ marginBottom: 10 }}>
            sys_user
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 8 }}>
            Users
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            {status === "ready"
              ? `${filtered.length} of ${users.length} shown.`
              : "Loading records from ServiceNow…"}
          </p>
        </section>

        {status === "ready" && users.length > 0 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, username, or email…"
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
              Couldn&apos;t load users
            </p>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>{error}</p>
          </div>
        )}

        {status === "ready" && filtered.length === 0 && (
          <div className="panel" style={{ padding: 24 }}>
            <p style={{ color: "var(--muted)" }}>No users match &ldquo;{query}&rdquo;.</p>
          </div>
        )}

        {status === "ready" && filtered.length > 0 && (
          <div className="panel" style={{ overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.sys_id ?? i}>
                    <td>{u.name || "—"}</td>
                    <td className="mono">{u.user_name || "—"}</td>
                    <td>{u.email || "—"}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          u.active === "true" ? "status-pill--on" : "status-pill--off"
                        }`}
                      >
                        {u.active === "true" ? "Active" : "Inactive"}
                      </span>
                    </td>
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

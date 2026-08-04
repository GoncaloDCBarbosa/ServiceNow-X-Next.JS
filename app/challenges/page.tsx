"use client";

import { Fragment, useEffect, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";

type Challenge = Record<string, string>;
type PageState = "loading" | "ready" | "error";

const TITLE_FIELDS = ["name", "short_description", "number"];
const DESCRIPTION_FIELDS = ["description", "short_description"];
const POINTS_FIELDS = ["points", "reward_points", "u_points", "point_value"];

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

function pick(record: Challenge, keys: string[]) {
  for (const key of keys) {
    if (record[key]) return { key, value: record[key] };
  }
  return null;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [status, setStatus] = useState<PageState>("loading");
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/api/challenges?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setChallenges(data.result ?? []);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Request failed.");
        setStatus("error");
      });
  }, []);

  return (
    <>
      <SiteHeader back={{ href: "/", label: "Console" }} />

      <main className="container" style={{ paddingBottom: 80 }}>
        <section style={{ marginBottom: 32 }}>
          <p className="eyebrow mono" style={{ marginBottom: 10 }}>
            x_trhrt_trh_plus_challenge
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 8 }}>
            Challenges
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15 }}>
            {status === "ready"
              ? `${challenges.length} record${challenges.length === 1 ? "" : "s"} loaded.`
              : "Loading records from ServiceNow…"}
          </p>
        </section>

        {status === "loading" && <SkeletonGrid />}

        {status === "error" && (
          <div className="panel" style={{ padding: 24, borderColor: "var(--bad)" }}>
            <p className="mono" style={{ color: "var(--bad)", marginBottom: 6, fontSize: 13 }}>
              Couldn&apos;t load challenges
            </p>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>{error}</p>
          </div>
        )}

        {status === "ready" && challenges.length === 0 && (
          <div className="panel" style={{ padding: 24 }}>
            <p style={{ color: "var(--muted)" }}>
              No challenges found in x_trhrt_trh_plus_challenge.
            </p>
          </div>
        )}

        {status === "ready" && challenges.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {challenges.map((c, i) => (
              <ChallengeCard key={c.sys_id ?? i} record={c} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ChallengeCard({ record }: { record: Challenge }) {
  const [expanded, setExpanded] = useState(false);

  const title = pick(record, TITLE_FIELDS);
  const description = pick(
    record,
    DESCRIPTION_FIELDS.filter((k) => k !== title?.key)
  );
  const points = pick(record, POINTS_FIELDS);
  const isActive =
    record.active === "true" ? true : record.active === "false" ? false : undefined;

  const extraFields = Object.entries(record).filter(
    ([key, value]) =>
      value && !HIDDEN_FIELDS.has(key) && key !== title?.key && key !== description?.key
  );

  return (
    <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          {title?.value ?? "Untitled challenge"}
        </h3>
        {isActive !== undefined && (
          <span className={`status-pill ${isActive ? "status-pill--on" : "status-pill--off"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        )}
      </div>

      {description && (
        <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
          {description.value}
        </p>
      )}

      {points && (
        <div className="mono" style={{ fontSize: 13, color: "var(--amber)" }}>
          {points.value} pts
        </div>
      )}

      {extraFields.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mono"
            style={{
              background: "none",
              border: "1px solid var(--hairline)",
              color: "var(--muted)",
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {expanded ? "Hide" : "Show"} all fields ({extraFields.length})
          </button>

          {expanded && (
            <dl style={{ marginTop: 10, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
              {extraFields.map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {key}
                  </dt>
                  <dd style={{ fontSize: 12.5, margin: 0, wordBreak: "break-word" }}>{value}</dd>
                </Fragment>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="panel" style={{ padding: 20, height: 140, opacity: 0.5 }} />
      ))}
    </div>
  );
}

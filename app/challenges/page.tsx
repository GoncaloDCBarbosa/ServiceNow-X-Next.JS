"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { normalizeRecords } from "@/lib/sn-format";

type Challenge = Record<string, string>;
type PageState = "loading" | "ready" | "error";

const TITLE_FIELDS = ["name", "short_description", "number"];
const DESCRIPTION_FIELDS = ["description", "short_description"];
const POINTS_FIELDS = ["points", "reward_points", "u_points", "point_value"];

// Candidate field names for whatever the table's lifecycle/state column
// turns out to be called — ServiceNow custom apps vary on this.
const STATE_FIELDS = ["state", "u_state", "workflow_state", "status", "publish_state"];

// Known lifecycle words get a sensible left-to-right order; anything else
// is sorted alphabetically after them.
const STATE_ORDER = [
  "draft",
  "pending",
  "in_review",
  "review",
  "published",
  "active",
  "archived",
  "retired",
  "closed",
];

function detectStateKey(records: Challenge[]) {
  for (const key of STATE_FIELDS) {
    if (records.some((r) => r[key])) return key;
  }
  return null;
}

function formatStateLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

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

// ServiceNow "duration" fields are stored as a full timestamp pinned to the
// 1970-01-01 epoch — only the HH:MM:SS part is meaningful, so strip the date.
const SN_DURATION_PATTERN = /^1970-01-01 (\d{2}:\d{2}:\d{2})$/;

function formatFieldValue(value: string) {
  const match = value.match(SN_DURATION_PATTERN);
  return match ? match[1] : value;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [status, setStatus] = useState<PageState>("loading");
  const [error, setError] = useState<string>();
  const [selectedState, setSelectedState] = useState("all");

  useEffect(() => {
    fetch("/api/challenges?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setChallenges(normalizeRecords(data.result ?? []));
        setSelectedState("all");
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Request failed.");
        setStatus("error");
      });
  }, []);

  const stateKey = useMemo(() => detectStateKey(challenges), [challenges]);

  const stateTabs = useMemo(() => {
    if (!stateKey) return [];

    const counts = new Map<string, number>();
    for (const c of challenges) {
      const value = c[stateKey];
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    const sortedValues = Array.from(counts.keys()).sort((a, b) => {
      const ia = STATE_ORDER.indexOf(a.toLowerCase());
      const ib = STATE_ORDER.indexOf(b.toLowerCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });

    return [
      { key: "all", label: "All", count: challenges.length },
      ...sortedValues.map((value) => ({
        key: value,
        label: formatStateLabel(value),
        count: counts.get(value) ?? 0,
      })),
    ];
  }, [challenges, stateKey]);

  const visibleChallenges = useMemo(() => {
    if (!stateKey || selectedState === "all") return challenges;
    return challenges.filter((c) => c[stateKey] === selectedState);
  }, [challenges, stateKey, selectedState]);

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
          <>
            {stateTabs.length > 1 && (
              <StateTabs states={stateTabs} active={selectedState} onChange={setSelectedState} />
            )}

            {visibleChallenges.length === 0 ? (
              <div className="panel" style={{ padding: 24 }}>
                <p style={{ color: "var(--muted)" }}>No challenges match this filter.</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {visibleChallenges.map((c, i) => (
                  <ChallengeCard key={c.sys_id ?? i} record={c} stateKey={stateKey} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function StateTabs({
  states,
  active,
  onChange,
}: {
  states: { key: string; label: string; count: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter challenges by state"
      className="mono"
      style={{
        display: "flex",
        gap: 4,
        overflowX: "auto",
        marginBottom: 24,
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      {states.map((s) => {
        const isActive = s.key === active;
        return (
          <button
            key={s.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(s.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexShrink: 0,
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid var(--violet)" : "2px solid transparent",
              color: isActive ? "var(--paper)" : "var(--muted)",
              padding: "0 4px 10px",
              marginRight: 18,
              fontSize: 12.5,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "color 150ms ease, border-color 150ms ease",
            }}
          >
            {s.label}
            <span
              style={{
                fontSize: 10.5,
                lineHeight: 1,
                padding: "3px 6px",
                borderRadius: 999,
                background: isActive ? "var(--violet-soft)" : "rgba(255,255,255,0.06)",
                color: isActive ? "var(--violet)" : "var(--muted)",
              }}
            >
              {s.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChallengeCard({ record, stateKey }: { record: Challenge; stateKey: string | null }) {
  const [expanded, setExpanded] = useState(false);

  const title = pick(record, TITLE_FIELDS);
  const description = pick(
    record,
    DESCRIPTION_FIELDS.filter((k) => k !== title?.key)
  );
  const points = pick(record, POINTS_FIELDS);
  const isActive =
    record.active === "true" ? true : record.active === "false" ? false : undefined;
  const stateValue = stateKey ? record[stateKey] : undefined;

  const extraFields = Object.entries(record).filter(
    ([key, value]) =>
      value &&
      !HIDDEN_FIELDS.has(key) &&
      key !== title?.key &&
      key !== description?.key &&
      key !== stateKey
  );

  return (
    <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          {title?.value ?? "Untitled challenge"}
        </h3>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {stateValue && (
            <span
              className="mono status-pill"
              style={{ color: "var(--violet)", borderColor: "var(--hairline)" }}
            >
              {formatStateLabel(stateValue)}
            </span>
          )}
          {isActive !== undefined && (
            <span className={`status-pill ${isActive ? "status-pill--on" : "status-pill--off"}`}>
              {isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>
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
                  <dd style={{ fontSize: 12.5, margin: 0, wordBreak: "break-word" }}>
                    {formatFieldValue(value)}
                  </dd>
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

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, Badge, ErrorState, RecordLink, useRecords } from "./components/ui";
import {
  detectStageField,
  formatValue,
  isCompletedStage,
  recordHref,
  stageLabel,
  stageTone,
  TABLES,
  tableLabel,
  tableTitle,
} from "@/lib/domain";

const INSTANCES = tableLabel(TABLES.participation, true);
const INSTANCES_TITLE = tableTitle(TABLES.participation, true);

const TITLE_FIELDS = ["name", "short_description", "number"];

function titleOf(record: Record<string, string>, fallback: string): string {
  for (const key of TITLE_FIELDS) {
    if (record[key]) return record[key];
  }
  return fallback;
}

export default function OverviewPage() {
  const challenges = useRecords("/api/challenges?limit=100");
  const participations = useRecords("/api/challenge-instances?limit=200");
  const players = useRecords("/api/players?limit=200");

  const stageField = useMemo(
    () => detectStageField(participations.records),
    [participations.records]
  );

  /* Participations are grouped by the challenge they belong to, which is what
     turns three record lists into an actual read on the programme. */
  const uptake = useMemo(() => {
    const byChallenge = new Map<string, { total: number; done: number }>();

    for (const p of participations.records) {
      const key = p.challenge;
      if (!key) continue;
      const entry = byChallenge.get(key) ?? { total: 0, done: 0 };
      entry.total += 1;
      const stage = stageField ? p[stageField] : "";
      if (isCompletedStage(stage) || p.completed === "true") entry.done += 1;
      byChallenge.set(key, entry);
    }

    return challenges.records
      .map((challenge) => {
        const name = titleOf(challenge, "Untitled challenge");
        const counts = byChallenge.get(name) ?? { total: 0, done: 0 };
        return { name, id: challenge.sys_id, ...counts };
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      .slice(0, 6);
  }, [challenges.records, participations.records, stageField]);

  const activeChallenges = challenges.records.filter((c) => c.active !== "false").length;

  const completed = participations.records.filter((p) => {
    const stage = stageField ? p[stageField] : "";
    return isCompletedStage(stage) || p.completed === "true";
  }).length;

  const inFlight = participations.records.length - completed;

  const recent = participations.records.slice(0, 5);

  const failed = challenges.state === "error" && participations.state === "error";

  return (
    <>
      <PageHeader
        title="Overview"
        description="Where the gamification programme stands right now — what people can take on, what they are working through, and who is taking part."
      />

      <div className="work-inner page-body">
        {failed ? (
          <ErrorState title="Nothing could be loaded" message={challenges.error} />
        ) : (
          <>
            <section className="figures" aria-label="Programme summary">
              <Figure
                value={activeChallenges}
                label="Challenges available"
                loading={challenges.state === "loading"}
              />
              <Figure
                value={inFlight}
                label={`${INSTANCES_TITLE} in progress`}
                loading={participations.state === "loading"}
              />
              <Figure
                value={completed}
                label="Completed"
                loading={participations.state === "loading"}
              />
              <Figure
                value={players.records.length}
                label="Players enrolled"
                loading={players.state === "loading"}
              />
            </section>

            <div className="split">
              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Challenge uptake</h2>
                  <Link href="/challenges" className="panel-note" style={{ color: "var(--brand)" }}>
                    All challenges
                  </Link>
                </div>

                {uptake.length === 0 ? (
                  <p className="panel-body panel-note">
                    {challenges.state === "loading"
                      ? "Loading…"
                      : "No challenges have been published yet."}
                  </p>
                ) : (
                  <div className="uptake">
                    {uptake.map((row) => (
                      <div key={row.name} className="uptake-row">
                        <span className="uptake-name" title={row.name}>
                          {row.id ? (
                            <RecordLink href={recordHref(TABLES.challenge, row.id)}>
                              {row.name}
                            </RecordLink>
                          ) : (
                            row.name
                          )}
                        </span>
                        <span className="uptake-meta">
                          {row.total === 0
                            ? "No takers"
                            : `${row.done}/${row.total} done`}
                        </span>
                        <span
                          className="meter"
                          role="img"
                          aria-label={
                            row.total === 0
                              ? `No ${INSTANCES}`
                              : `${Math.round((row.done / row.total) * 100)} percent complete`
                          }
                        >
                          {row.done > 0 && (
                            <span
                              className="meter-fill"
                              style={{ width: `${(row.done / row.total) * 100}%` }}
                            />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Latest {INSTANCES}</h2>
                  <Link
                    href="/challenge-instances"
                    className="panel-note"
                    style={{ color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 3 }}
                  >
                    Open
                    <ArrowUpRight size={13} aria-hidden />
                  </Link>
                </div>

                {recent.length === 0 ? (
                  <p className="panel-body panel-note">
                    {participations.state === "loading"
                      ? "Loading…"
                      : "Nobody has taken on a challenge yet."}
                  </p>
                ) : (
                  <div className="uptake">
                    {recent.map((p, i) => {
                      const stage = stageField ? p[stageField] : "";
                      return (
                        <div
                          key={p.sys_id ?? i}
                          className="uptake-row"
                          style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
                        >
                          <span>
                            <span className="uptake-name" title={p.challenge}>
                              {p.sys_id ? (
                                <RecordLink href={recordHref(TABLES.participation, p.sys_id)}>
                                  {p.challenge || `Untitled ${tableLabel(TABLES.participation)}`}
                                </RecordLink>
                              ) : (
                                p.challenge || `Untitled ${tableLabel(TABLES.participation)}`
                              )}
                            </span>
                            <span className="card-sub">
                              {formatValue(p.player || p.team || p.user)}
                            </span>
                          </span>
                          {stage && (
                            <Badge tone={stageTone(stage)}>{stageLabel(stage)}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Figure({
  value,
  label,
  loading,
}: {
  value: number;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="figure">
      {loading ? (
        <span className="skeleton" style={{ display: "block", height: 28, width: 48 }} />
      ) : (
        <p className="figure-value">{value}</p>
      )}
      <p className="figure-label">{label}</p>
    </div>
  );
}

"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Badge,
  CardSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  RecordLink,
  SearchBox,
  StageFilter,
  useRecords,
  type FilterOption,
} from "../components/ui";
import {
  detectStageField,
  fieldLabel,
  formatValue,
  isSystemField,
  recordHref,
  sortStages,
  stageLabel,
  stageTone,
  TABLES,
} from "@/lib/domain";

type Challenge = Record<string, string>;

const TITLE_FIELDS = ["name", "short_description", "number"];
const SUMMARY_FIELDS = ["description", "short_description"];
const POINTS_FIELDS = ["points", "reward_points", "u_points", "point_value"];
const HEADLINE_FACTS = ["start_date", "end_date", "target", "level"];

function pick(record: Challenge, keys: string[]) {
  for (const key of keys) {
    if (record[key]) return { key, value: record[key] };
  }
  return null;
}

export default function ChallengesPage() {
  const { records, state, error } = useRecords("/api/challenges?limit=100");
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");

  const stageField = useMemo(() => detectStageField(records), [records]);

  const stageOptions = useMemo<FilterOption[]>(() => {
    if (!stageField) return [];

    const counts = new Map<string, number>();
    for (const record of records) {
      const value = record[stageField];
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    if (counts.size < 2) return [];

    return [
      { key: "all", label: "All", count: records.length },
      ...sortStages([...counts.keys()]).map((value) => ({
        key: value,
        label: stageLabel(value),
        count: counts.get(value) ?? 0,
      })),
    ];
  }, [records, stageField]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();

    return records.filter((record) => {
      if (stageField && stage !== "all" && record[stageField] !== stage) return false;
      if (!term) return true;
      return Object.entries(record).some(
        ([key, value]) => !isSystemField(key) && value.toLowerCase().includes(term)
      );
    });
  }, [records, stageField, stage, query]);

  return (
    <>
      <PageHeader
        title="Challenges"
        description="Everything people can take on: what it asks for, what it is worth, and when it runs."
      />

      <div className="work-inner page-body">
        {state === "loading" && <CardSkeleton />}

        {state === "error" && (
          <ErrorState title="Challenges could not be loaded" message={error} />
        )}

        {state === "ready" && records.length === 0 && (
          <EmptyState
            title="No challenges yet"
            text="Once a challenge is published in the gamification app, it will appear here."
          />
        )}

        {state === "ready" && records.length > 0 && (
          <>
            <div className="toolbar">
              {stageOptions.length > 0 ? (
                <StageFilter
                  options={stageOptions}
                  active={stage}
                  onChange={setStage}
                  label="Filter challenges by stage"
                />
              ) : (
                <span className="panel-note">
                  {visible.length} of {records.length} challenges
                </span>
              )}

              <SearchBox
                value={query}
                onChange={setQuery}
                label="Search challenges"
                placeholder="Search challenges"
              />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                title="Nothing matches"
                text="Try a different search term, or clear the stage filter to see every challenge."
              />
            ) : (
              <div className="cards">
                {visible.map((record, i) => (
                  <ChallengeCard
                    key={record.sys_id ?? i}
                    record={record}
                    stageField={stageField}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ChallengeCard({
  record,
  stageField,
}: {
  record: Challenge;
  stageField: string | null;
}) {
  const [open, setOpen] = useState(false);
  const href = record.sys_id ? recordHref(TABLES.challenge, record.sys_id) : null;

  const title = pick(record, TITLE_FIELDS);
  const summary = pick(record, SUMMARY_FIELDS.filter((k) => k !== title?.key));
  const points = pick(record, POINTS_FIELDS);
  const stage = stageField ? record[stageField] : "";
  const isActive = record.active === "true" ? true : record.active === "false" ? false : null;

  const facts = HEADLINE_FACTS.filter((key) => record[key]).map((key) => ({
    key,
    value: record[key],
  }));

  const remaining = Object.entries(record).filter(
    ([key, value]) =>
      value &&
      !isSystemField(key) &&
      key !== title?.key &&
      key !== summary?.key &&
      key !== stageField &&
      key !== points?.key &&
      key !== "active" &&
      !HEADLINE_FACTS.includes(key)
  );

  return (
    <article className="card">
      <div className="card-top">
        <div>
          <h2 className="card-title">
            {href ? (
              <RecordLink href={href} className="card-link">
                {title?.value ?? "Untitled challenge"}
              </RecordLink>
            ) : (
              (title?.value ?? "Untitled challenge")
            )}
          </h2>
          {points && <p className="card-sub">Worth {points.value} points</p>}
        </div>

        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {stage && <Badge tone={stageTone(stage)}>{stageLabel(stage)}</Badge>}
          {isActive === false && <Badge tone="neutral">Retired</Badge>}
        </div>
      </div>

      {summary && <p className="card-text">{summary.value}</p>}

      {facts.length > 0 && (
        <div className="card-facts">
          {facts.map((fact) => (
            <div key={fact.key}>
              <p className="fact-label">{fieldLabel(fact.key)}</p>
              <p className="fact-value">{formatValue(fact.value)}</p>
            </div>
          ))}
        </div>
      )}

      {(remaining.length > 0 || href) && (
        <div>
          <div className="card-actions">
            {remaining.length > 0 && (
              <button
                type="button"
                className="detail-toggle"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? "Hide details" : "Show details"}
              </button>
            )}
            {href && (
              <RecordLink href={href} className="detail-toggle">
                Open record
              </RecordLink>
            )}
          </div>

          {open && (
            <dl className="detail-grid">
              {remaining.map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="detail-key">{fieldLabel(key)}</dt>
                  <dd className="detail-val">{formatValue(value)}</dd>
                </Fragment>
              ))}
            </dl>
          )}
        </div>
      )}
    </article>
  );
}

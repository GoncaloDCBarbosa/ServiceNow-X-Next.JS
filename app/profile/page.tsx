"use client";

import { useMemo } from "react";
import {
  Badge,
  EmptyState,
  ErrorState,
  LinkedValue,
  OpenHeader,
  OpenableRow,
  PageHeader,
  RecordLink,
  useResource,
} from "../components/ui";
import {
  detectStageField,
  EMPTY_VALUE,
  fieldLabel,
  isCompletedStage,
  isSystemField,
  numericColumns,
  recordHref,
  recordTitle,
  stageLabel,
  stageTone,
  TABLES,
  tableTitle,
} from "@/lib/domain";
import { normalizeRecords } from "@/lib/sn-format";

type Profile = {
  user: Record<string, unknown>;
  player: Record<string, unknown> | null;
  participations: Record<string, unknown>[];
};

const RECENT = 8;
const RUN_COLUMNS = ["challenge", "state", "start_date", "points"];

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

export default function ProfilePage() {
  const { data, state, error } = useResource<Profile>("/api/profile");

  const user = useMemo(() => (data ? normalizeRecords([data.user])[0] : null), [data]);
  const player = useMemo(() => (data?.player ? normalizeRecords([data.player])[0] : null), [data]);
  const runs = useMemo(() => normalizeRecords(data?.participations ?? []), [data]);

  const stageField = useMemo(() => detectStageField(runs), [runs]);

  const stats = useMemo(() => {
    const done = runs.filter(
      (r) => (stageField && isCompletedStage(r[stageField])) || r.completed === "true"
    );
    const points = done.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
    return { total: runs.length, completed: done.length, points };
  }, [runs, stageField]);

  const playerFields = useMemo(
    () => (player ? Object.keys(player).filter((k) => !isSystemField(k)) : []),
    [player]
  );

  const runColumns = useMemo(() => {
    const keys = new Set(runs.flatMap((r) => Object.keys(r)));
    return RUN_COLUMNS.filter((k) => keys.has(k));
  }, [runs]);

  const numeric = useMemo(() => numericColumns(runs, runColumns), [runs, runColumns]);

  return (
    <>
      <PageHeader
        title="Profile"
        description="The ServiceNow account this console is signed in as, and how it is doing in the programme."
      />

      <div className="work-inner page-body record-body">
        {state === "loading" && (
          <div className="panel" aria-hidden>
            <div className="profile-head">
              <span className="skeleton avatar" />
              <span style={{ flex: 1 }}>
                <span className="skeleton" style={{ display: "block", height: 14, width: "30%" }} />
                <span
                  className="skeleton"
                  style={{ display: "block", height: 11, width: "45%", marginTop: 8 }}
                />
              </span>
            </div>
          </div>
        )}

        {state === "error" && <ErrorState title="The profile could not be loaded" message={error} />}

        {state === "ready" && user && (
          <>
            <section className="panel" aria-label="Account">
              <div className="profile-head">
                <span className="avatar" aria-hidden>
                  {initials(user.name)}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 className="profile-name">{user.name || EMPTY_VALUE}</h2>
                  <p className="profile-meta">
                    {[user.title, user.email, user.department].filter(Boolean).join(" · ") ||
                      user.user_name}
                  </p>
                </div>
                {user.active === "false" && <Badge tone="neutral">Inactive</Badge>}
                {user.sys_id && (
                  <RecordLink href={recordHref(TABLES.user, user.sys_id)}>Full record</RecordLink>
                )}
              </div>
            </section>

            {player ? (
              <>
                <section className="figures" aria-label="Programme summary">
                  <div className="figure">
                    <p className="figure-value">{stats.total}</p>
                    <p className="figure-label">{tableTitle(TABLES.participation, true)}</p>
                  </div>
                  <div className="figure">
                    <p className="figure-value">{stats.completed}</p>
                    <p className="figure-label">Completed</p>
                  </div>
                  <div className="figure">
                    <p className="figure-value">{stats.points.toLocaleString("en-GB")}</p>
                    <p className="figure-label">Points earned</p>
                  </div>
                </section>

                <section className="panel" aria-label="Player profile">
                  <div className="panel-head">
                    <h2 className="panel-title">Player profile</h2>
                    {player.sys_id && (
                      <RecordLink href={recordHref(TABLES.player, player.sys_id)}>
                        Open record
                      </RecordLink>
                    )}
                  </div>
                  <dl className="record-form">
                    {playerFields.map((key) => (
                      <div key={key} className="record-row">
                        <dt className="record-label">{fieldLabel(key)}</dt>
                        <dd className="record-value">
                          <LinkedValue record={player} column={key} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="panel" aria-label="Recent activity">
                  <div className="panel-head">
                    <h2 className="panel-title">Recent {tableTitle(TABLES.participation, true)}</h2>
                    <span className="panel-note">
                      {runs.length > RECENT ? `Latest ${RECENT} of ${runs.length}` : runs.length}
                    </span>
                  </div>

                  {runs.length === 0 ? (
                    <p className="panel-body panel-note">
                      This player hasn&apos;t taken on a challenge yet.
                    </p>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            {runColumns.map((column) => (
                              <th key={column} className={numeric.has(column) ? "num" : undefined}>
                                {fieldLabel(column)}
                              </th>
                            ))}
                            <OpenHeader />
                          </tr>
                        </thead>
                        <tbody>
                          {runs.slice(0, RECENT).map((run, i) => (
                            <OpenableRow
                              key={run.sys_id ?? i}
                              href={run.sys_id ? recordHref(TABLES.participation, run.sys_id) : null}
                              label={recordTitle(TABLES.participation, run)}
                            >
                              {runColumns.map((column, index) => (
                                <td
                                  key={column}
                                  className={
                                    [numeric.has(column) ? "num" : "", index === 0 ? "primary" : ""]
                                      .filter(Boolean)
                                      .join(" ") || undefined
                                  }
                                >
                                  {column === stageField && run[column] ? (
                                    <Badge tone={stageTone(run[column])}>
                                      {stageLabel(run[column])}
                                    </Badge>
                                  ) : (
                                    <LinkedValue record={run} column={column} />
                                  )}
                                </td>
                              ))}
                            </OpenableRow>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <EmptyState
                title="No player profile yet"
                text="This account isn't enrolled as a player, so there is no score or activity to show."
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

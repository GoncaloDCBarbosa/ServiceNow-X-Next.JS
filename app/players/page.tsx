"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  ErrorState,
  LinkedValue,
  OpenHeader,
  OpenableRow,
  PageHeader,
  SearchBox,
  TableSkeleton,
  useRecords,
} from "../components/ui";
import {
  fieldLabel,
  formatValue,
  isSystemField,
  numericColumns,
  recordHref,
  recordTitle,
  TABLES,
} from "@/lib/domain";

/* The player table is a custom one, so its columns aren't known ahead of
   time — they come from the records themselves. This ordering pulls the
   identifying columns to the left and pushes scores to the right, which is
   how someone reads a leaderboard. */
const COLUMN_PRIORITY = ["user", "name", "player", "team", "level", "rank"];
const TRAILING_COLUMNS = ["points", "total_points", "score", "active"];

function orderColumns(keys: string[]): string[] {
  const rest = keys.filter(
    (k) => !COLUMN_PRIORITY.includes(k) && !TRAILING_COLUMNS.includes(k)
  );
  return [
    ...COLUMN_PRIORITY.filter((k) => keys.includes(k)),
    ...rest,
    ...TRAILING_COLUMNS.filter((k) => keys.includes(k)),
  ];
}

export default function PlayersPage() {
  const { records, state, error } = useRecords("/api/players?limit=200");
  const [query, setQuery] = useState("");

  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const record of records) {
      for (const key of Object.keys(record)) {
        if (!isSystemField(key)) keys.add(key);
      }
    }
    return orderColumns([...keys]);
  }, [records]);

  const numeric = useMemo(() => numericColumns(records, columns), [records, columns]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) =>
      columns.some((column) => (record[column] || "").toLowerCase().includes(term))
    );
  }, [records, columns, query]);

  return (
    <>
      <PageHeader
        title="Players"
        description="Everyone enrolled in the programme, with the score and level they have reached."
      />

      <div className="work-inner page-body">
        {state === "loading" && <TableSkeleton columns={5} />}

        {state === "error" && <ErrorState title="Players could not be loaded" message={error} />}

        {state === "ready" && records.length === 0 && (
          <EmptyState
            title="Nobody is enrolled yet"
            text="A player profile is created the first time someone joins the programme."
          />
        )}

        {state === "ready" && records.length > 0 && (
          <>
            <div className="toolbar">
              <span className="panel-note">
                {visible.length === records.length
                  ? `${records.length} players`
                  : `${visible.length} of ${records.length} players`}
              </span>
              <SearchBox
                value={query}
                onChange={setQuery}
                label="Search players"
                placeholder="Search players"
              />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                title="Nothing matches"
                text="No player matches that search. Try part of a name instead."
              />
            ) : (
              <div className="panel">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        {columns.map((column) => (
                          <th key={column} className={numeric.has(column) ? "num" : undefined}>
                            {fieldLabel(column)}
                          </th>
                        ))}
                        <OpenHeader />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((record, i) => (
                        <OpenableRow
                          key={record.sys_id ?? i}
                          href={record.sys_id ? recordHref(TABLES.player, record.sys_id) : null}
                          label={recordTitle(TABLES.player, record)}
                        >
                          {columns.map((column, index) => (
                            <Cell
                              key={column}
                              column={column}
                              record={record}
                              numeric={numeric.has(column)}
                              primary={index === 0}
                            />
                          ))}
                        </OpenableRow>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Cell({
  column,
  record,
  numeric,
  primary,
}: {
  column: string;
  record: Record<string, string>;
  numeric: boolean;
  primary: boolean;
}) {
  const value = record[column];

  if (column === "active") {
    return (
      <td>
        {value === "true" ? (
          <Badge tone="positive">Active</Badge>
        ) : value === "false" ? (
          <Badge tone="neutral">Inactive</Badge>
        ) : (
          formatValue(value)
        )}
      </td>
    );
  }

  return (
    <td className={[numeric ? "num" : "", primary ? "primary" : ""].filter(Boolean).join(" ")}>
      <LinkedValue record={record} column={column} />
    </td>
  );
}

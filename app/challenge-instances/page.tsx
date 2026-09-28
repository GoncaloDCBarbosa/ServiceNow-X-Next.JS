"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Plus, X } from "lucide-react";
import {
  Badge,
  EmptyState,
  ErrorState,
  LinkedValue,
  OpenHeader,
  OpenableRow,
  PageHeader,
  SearchBox,
  StageFilter,
  TableSkeleton,
  useRecords,
  type FilterOption,
} from "../components/ui";
import { normalizeRecords } from "@/lib/sn-format";
import {
  detectStageField,
  fieldLabel,
  numericColumns,
  isSystemField,
  recordHref,
  recordTitle,
  scrubMessage,
  sortStages,
  stageLabel,
  stageTone,
  TABLES,
  tableLabel,
  tableTitle,
} from "@/lib/domain";

type Participation = Record<string, string>;

/* What this screen is called comes from one place (TABLE_LABELS in
   lib/domain.ts), so renaming it there renames it everywhere. */
const ONE = tableLabel(TABLES.participation);
const MANY = tableLabel(TABLES.participation, true);
const TITLE_MANY = tableTitle(TABLES.participation, true);

/* Column order reads the way the record does: which challenge, who is doing
   it, how far along, and when. Scores sit at the right-hand edge. */
const IDENTITY_COLUMNS = ["challenge", "player", "team", "user"];
const TIMING_COLUMNS = ["start_date", "end_date", "completed_on"];
const TRAILING_COLUMNS = ["progress", "points", "score", "completed", "active"];

export default function ParticipationsPage() {
  const { records, setRecords, state, error } = useRecords(
    "/api/challenge-instances?limit=200"
  );
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const stageField = useMemo(() => detectStageField(records), [records]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const record of records) {
      for (const key of Object.keys(record)) {
        if (!isSystemField(key)) keys.add(key);
      }
    }

    const identity = IDENTITY_COLUMNS.filter((k) => keys.has(k));
    const timing = TIMING_COLUMNS.filter((k) => keys.has(k));
    const trailing = TRAILING_COLUMNS.filter((k) => keys.has(k));

    // The lifecycle column sits right after the identifying ones — it is the
    // first thing anyone scans for.
    const placed = new Set([...identity, ...timing, ...trailing, stageField ?? ""]);
    const middle = [...keys].filter((k) => !placed.has(k));

    return [
      ...identity,
      ...(stageField && keys.has(stageField) ? [stageField] : []),
      ...timing,
      ...middle,
      ...trailing,
    ];
  }, [records, stageField]);

  const numeric = useMemo(() => numericColumns(records, columns), [records, columns]);

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
      return columns.some((column) => (record[column] || "").toLowerCase().includes(term));
    });
  }, [records, columns, stageField, stage, query]);

  const newParticipation = (
    <button type="button" className="btn" data-variant="primary" onClick={() => setCreating(true)}>
      <Plus size={15} strokeWidth={2} aria-hidden />
      New {ONE}
    </button>
  );

  return (
    <>
      <PageHeader
        title={TITLE_MANY}
        description="Every challenge someone has taken on, in progress or finished."
        actions={newParticipation}
      />

      <div className="work-inner page-body">
        {state === "loading" && <TableSkeleton columns={5} />}

        {state === "error" && (
          <ErrorState title={`${TITLE_MANY} could not be loaded`} message={error} />
        )}

        {state === "ready" && records.length === 0 && (
          <EmptyState
            title="Nobody has started a challenge yet"
            text="Add the first one and their progress will show up here."
            action={newParticipation}
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
                  label={`Filter ${MANY} by stage`}
                />
              ) : (
                <span className="panel-note">
                  {records.length} {MANY}
                </span>
              )}

              <SearchBox
                value={query}
                onChange={setQuery}
                label={`Search ${MANY}`}
                placeholder="Search by challenge or player"
              />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                title="Nothing matches"
                text={`No ${ONE} matches the current search and filter.`}
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
                          href={record.sys_id ? recordHref(TABLES.participation, record.sys_id) : null}
                          label={recordTitle(TABLES.participation, record)}
                        >
                          {columns.map((column, index) => {
                            const value = record[column];

                            if (column === stageField && value) {
                              return (
                                <td key={column}>
                                  <Badge tone={stageTone(value)}>{stageLabel(value)}</Badge>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={column}
                                className={[
                                  numeric.has(column) ? "num" : "",
                                  index === 0 ? "primary" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <LinkedValue record={record} column={column} />
                              </td>
                            );
                          })}
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

      {creating && (
        <CreateParticipationDialog
          knownFields={columns}
          onClose={() => setCreating(false)}
          onCreated={(record) => {
            setRecords((prev) => [normalizeRecords([record])[0], ...prev]);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

/* ==========================================================================
   Create dialog
   --------------------------------------------------------------------------
   The form is built from the table's own dictionary entry, so it always
   matches the real record shape: reference columns become a search picker
   that only ever submits a real record, choice columns become a select, and
   dates and numbers get the right input. If the dictionary can't be read,
   it degrades to plain text fields.
   ========================================================================== */

type ChoiceOption = { value: string; label: string };

type FieldSchema = {
  element: string;
  label: string;
  type: string;
  reference?: string;
  mandatory: boolean;
  choices?: ChoiceOption[];
};

type LookupResult = { sys_id: string; label: string };

type FieldRow = {
  id: string;
  key: string;
  value: string;
  displayValue?: string;
  label: string;
  type?: string;
  reference?: string;
  choices?: ChoiceOption[];
  mandatory?: boolean;
};

/* ServiceNow fills these itself, from the chosen challenge or once the run
   starts — asking a person to type them would only create bad data. */
const DERIVED_FIELDS = new Set(["start_date", "end_date", "points", "state"]);

const NUMERIC_TYPES = new Set(["integer", "decimal", "float", "longint"]);

let rowCounter = 0;
const nextRowId = () => `row-${++rowCounter}`;

function rowFromSchema(field: FieldSchema): FieldRow {
  return {
    id: nextRowId(),
    key: field.element,
    value: "",
    label: field.label || fieldLabel(field.element),
    type: field.type,
    // Some instances resolve this to an object — never let that reach a
    // lookup URL as "[object Object]".
    reference: typeof field.reference === "string" ? field.reference : undefined,
    choices: field.choices && field.choices.length > 0 ? field.choices : undefined,
    mandatory: field.mandatory,
  };
}

/** Converts a row's stored value into what the Table API expects. */
function formatForSubmit(row: FieldRow): string {
  if (row.type === "glide_date_time" && row.value) {
    // <input type="datetime-local"> yields "YYYY-MM-DDTHH:mm".
    const withSeconds = row.value.length === 16 ? `${row.value}:00` : row.value;
    return withSeconds.replace("T", " ");
  }
  return row.value;
}

type LookupState = { query: string; results: LookupResult[]; loading: boolean; open: boolean };

function CreateParticipationDialog({
  knownFields,
  onClose,
  onCreated,
}: {
  knownFields: string[];
  onClose: () => void;
  onCreated: (record: Participation) => void;
}) {
  const [schemaState, setSchemaState] = useState<"loading" | "ready" | "fallback">("loading");
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [lookups, setLookups] = useState<Record<string, LookupState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetch("/api/challenge-instances/schema")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const fields: FieldSchema[] = (data.result ?? []).filter(
          (f: FieldSchema) => !DERIVED_FIELDS.has(f.element)
        );
        if (fields.length === 0) throw new Error("No fields returned.");
        setRows(fields.map(rowFromSchema));
        setSchemaState("ready");
      })
      .catch(() => {
        const usable = knownFields.filter((key) => !DERIVED_FIELDS.has(key));
        setRows(
          usable.map((key) => ({
            id: nextRowId(),
            key,
            value: "",
            label: fieldLabel(key),
          }))
        );
        setSchemaState("fallback");
      });
    // Runs once: knownFields is a snapshot from when the dialog opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  // Escape closes the dialog, as it does everywhere else in the product.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function updateRow(id: string, patch: Partial<FieldRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function runLookup(row: FieldRow, term: string) {
    if (!row.reference) return;

    setLookups((prev) => ({
      ...prev,
      [row.id]: { query: term, results: prev[row.id]?.results ?? [], loading: true, open: true },
    }));

    clearTimeout(timers.current[row.id]);
    timers.current[row.id] = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/lookup?table=${encodeURIComponent(row.reference!)}&q=${encodeURIComponent(term)}`
        );
        const data = await res.json();
        setLookups((prev) => ({
          ...prev,
          [row.id]: { query: term, results: data.result ?? [], loading: false, open: true },
        }));
      } catch {
        setLookups((prev) => ({
          ...prev,
          [row.id]: { query: term, results: [], loading: false, open: true },
        }));
      }
    }, 300);
  }

  function selectLookupResult(row: FieldRow, result: LookupResult) {
    updateRow(row.id, { value: result.sys_id, displayValue: result.label });
    setLookups((prev) => ({
      ...prev,
      [row.id]: { query: result.label, results: [], loading: false, open: false },
    }));

    // A run belongs either to a player or to a team, never both.
    const opposite = row.key === "player" ? "team" : row.key === "team" ? "player" : null;
    if (opposite) {
      const other = rows.find((r) => r.key === opposite);
      if (other) updateRow(other.id, { value: "", displayValue: undefined });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const body: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (!key) continue;
      // Free text never lands in a reference column — only a picked record.
      if (row.reference && !row.value) continue;
      const value = formatForSubmit(row);
      if (value) body[key] = value;
    }

    const missing = rows.find((row) => row.mandatory && !body[row.key]);
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }

    if (Object.keys(body).length === 0) {
      setError("Fill in at least one field before saving.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/challenge-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Request failed.");
      onCreated((data.result ?? {}) as Participation);
    } catch (err) {
      setError(scrubMessage(err instanceof Error ? err.message : undefined));
    } finally {
      setSubmitting(false);
    }
  }

  const playerValue = rows.find((r) => r.key === "player")?.value;
  const teamValue = rows.find((r) => r.key === "team")?.value;

  return (
    <div className="scrim" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-participation-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <div>
            <h2 className="dialog-title" id="create-participation-title">
              New {ONE}
            </h2>
            <p className="dialog-sub">
              Pick a challenge and who is taking it on. Dates, points and stage are set
              automatically once it starts.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={15} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            {schemaState === "loading" ? (
              <>
                <span className="skeleton" style={{ height: 34 }} />
                <span className="skeleton" style={{ height: 34 }} />
                <span className="skeleton" style={{ height: 34 }} />
              </>
            ) : (
              rows.map((row) => (
                <FieldControl
                  key={row.id}
                  row={row}
                  lookup={lookups[row.id]}
                  blocked={
                    (row.key === "player" && !!teamValue) ||
                    (row.key === "team" && !!playerValue)
                  }
                  onChangeValue={(value) =>
                    updateRow(row.id, { value, displayValue: undefined })
                  }
                  onSearch={(term) => runLookup(row, term)}
                  onSelectResult={(result) => selectLookupResult(row, result)}
                  onCloseLookup={() =>
                    setLookups((prev) =>
                      prev[row.id] ? { ...prev, [row.id]: { ...prev[row.id], open: false } } : prev
                    )
                  }
                />
              ))
            )}

            {error && (
              <p role="alert" style={{ color: "var(--critical)", fontSize: 13 }}>
                {error}
              </p>
            )}
          </div>

          <div className="dialog-foot">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              data-variant="primary"
              disabled={submitting || schemaState === "loading"}
            >
              {submitting ? "Creating…" : `Create ${ONE}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldControl({
  row,
  lookup,
  blocked,
  onChangeValue,
  onSearch,
  onSelectResult,
  onCloseLookup,
}: {
  row: FieldRow;
  lookup?: LookupState;
  blocked: boolean;
  onChangeValue: (value: string) => void;
  onSearch: (term: string) => void;
  onSelectResult: (result: LookupResult) => void;
  onCloseLookup: () => void;
}) {
  const controlId = `field-${row.id}`;

  return (
    <div className="field">
      <label className="field-label" htmlFor={controlId}>
        {row.label}
        {row.mandatory && (
          <span className="field-required" aria-hidden>
            *
          </span>
        )}
        {blocked && (
          <span className="field-hint">
            Not available — a {row.key === "player" ? "team" : "player"} is already selected
          </span>
        )}
      </label>

      <div className="field-control">
        {row.reference ? (
          <>
            <input
              id={controlId}
              className="input"
              value={row.displayValue ?? lookup?.query ?? ""}
              onChange={(e) => {
                onChangeValue("");
                onSearch(e.target.value);
              }}
              onFocus={(e) => !blocked && onSearch(e.target.value)}
              onBlur={() => setTimeout(onCloseLookup, 150)}
              disabled={blocked}
              autoComplete="off"
              placeholder={`Search ${tableLabel(row.reference, true)}`}
              style={row.value ? { paddingRight: 30 } : undefined}
            />

            {row.value && !blocked && (
              <button
                type="button"
                className="clear-value"
                onClick={() => onChangeValue("")}
                aria-label={`Clear ${row.label}`}
              >
                <X size={13} aria-hidden />
              </button>
            )}

            {lookup?.open && (lookup.loading || lookup.results.length > 0 || lookup.query) && (
              <div className="combo">
                {lookup.loading ? (
                  <p className="combo-note">Searching…</p>
                ) : lookup.results.length === 0 ? (
                  <p className="combo-note">No match for “{lookup.query}”.</p>
                ) : (
                  lookup.results.map((result) => (
                    <button
                      key={result.sys_id}
                      type="button"
                      className="combo-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSelectResult(result)}
                    >
                      {result.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        ) : row.choices ? (
          <select
            id={controlId}
            className="input"
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
          >
            <option value="">Not set</option>
            {row.choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        ) : row.type === "boolean" ? (
          <label className="checkbox" htmlFor={controlId}>
            <input
              id={controlId}
              type="checkbox"
              checked={row.value === "true"}
              onChange={(e) => onChangeValue(e.target.checked ? "true" : "false")}
            />
            {row.value === "true" ? "Yes" : "No"}
          </label>
        ) : row.type === "glide_date" ? (
          <input
            id={controlId}
            type="date"
            className="input"
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
          />
        ) : row.type === "glide_date_time" ? (
          <input
            id={controlId}
            type="datetime-local"
            className="input"
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
          />
        ) : NUMERIC_TYPES.has(row.type ?? "") ? (
          <input
            id={controlId}
            type="number"
            className="input"
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
          />
        ) : (
          <input
            id={controlId}
            className="input"
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

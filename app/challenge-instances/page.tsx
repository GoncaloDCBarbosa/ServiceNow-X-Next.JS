"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";
import { normalizeRecords } from "@/lib/sn-format";

type Challenge = Record<string, string>;
type PageState = "loading" | "ready" | "error";

// This table has no "name"/"short_description"/"number" field of its own —
// unlike Challenges or Players, an instance's natural title is whichever
// Challenge it's a run of, so "challenge" is included as the last-resort
// source. It comes through as a proper label (not a sys_id) now that the
// API route requests sysparm_display_value=all.
const TITLE_FIELDS = ["name", "short_description", "number", "challenge"];
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

export default function ChallengeInstancesPage() {
  const [instances, setInstances] = useState<Challenge[]>([]);
  const [status, setStatus] = useState<PageState>("loading");
  const [error, setError] = useState<string>();
  const [selectedState, setSelectedState] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/challenge-instances?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setInstances(normalizeRecords(data.result ?? []));
        setSelectedState("all");
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Request failed.");
        setStatus("error");
      });
  }, []);

  const stateKey = useMemo(() => detectStateKey(instances), [instances]);

  // Only used if the schema endpoint (sys_dictionary) can't be read — the
  // Table API still returns every field on every record, so the keys on
  // the first loaded record double as a plain-text fallback field list.
  const fallbackFields = useMemo(() => {
    if (instances.length === 0) return [];
    return Object.keys(instances[0]).filter((k) => !HIDDEN_FIELDS.has(k));
  }, [instances]);

  const stateTabs = useMemo(() => {
    if (!stateKey) return [];

    const counts = new Map<string, number>();
    for (const c of instances) {
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
      { key: "all", label: "All", count: instances.length },
      ...sortedValues.map((value) => ({
        key: value,
        label: formatStateLabel(value),
        count: counts.get(value) ?? 0,
      })),
    ];
  }, [instances, stateKey]);

  const visibleInstances = useMemo(() => {
    if (!stateKey || selectedState === "all") return instances;
    return instances.filter((c) => c[stateKey] === selectedState);
  }, [instances, stateKey, selectedState]);

  return (
    <>
      <SiteHeader back={{ href: "/", label: "Console" }} />

      <main className="container" style={{ paddingBottom: 80 }}>
        <section
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow mono" style={{ marginBottom: 10 }}>
              x_trhrt_trh_plus_challenge_instance
            </p>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.015em", marginBottom: 8 }}>
              Challenge Instances
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 15 }}>
              {status === "ready"
                ? `${instances.length} record${instances.length === 1 ? "" : "s"} loaded.`
                : "Loading records from ServiceNow…"}
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="mono"
            style={{
              background: "var(--accent)",
              border: "1px solid var(--accent)",
              color: "var(--ink)",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={14} aria-hidden />
            New instance
          </button>
        </section>

        {status === "loading" && <SkeletonGrid />}

        {status === "error" && (
          <div className="panel" style={{ padding: 24, borderColor: "var(--bad)" }}>
            <p className="mono" style={{ color: "var(--bad)", marginBottom: 6, fontSize: 13 }}>
              Couldn&apos;t load challenge instances
            </p>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>{error}</p>
          </div>
        )}

        {status === "ready" && instances.length === 0 && (
          <div className="panel" style={{ padding: 24 }}>
            <p style={{ color: "var(--muted)" }}>
              No challenge instances found in x_trhrt_trh_plus_challenge_instance.
            </p>
          </div>
        )}

        {status === "ready" && instances.length > 0 && (
          <>
            {stateTabs.length > 1 && (
              <StateTabs states={stateTabs} active={selectedState} onChange={setSelectedState} />
            )}

            {visibleInstances.length === 0 ? (
              <div className="panel" style={{ padding: 24 }}>
                <p style={{ color: "var(--muted)" }}>No challenge instances match this filter.</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {visibleInstances.map((c, i) => (
                  <ChallengeCard key={c.sys_id ?? i} record={c} stateKey={stateKey} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showCreate && (
        <CreateInstanceModal
          fallbackFields={fallbackFields}
          onClose={() => setShowCreate(false)}
          onCreated={(record) => {
            setInstances((prev) => [normalizeRecords([record])[0], ...prev]);
            setShowCreate(false);
          }}
        />
      )}
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
      aria-label="Filter challenge instances by state"
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
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
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
                fontSize: 12,
                lineHeight: 1,
                padding: "3px 6px",
                borderRadius: 999,
                background: isActive ? "var(--accent-soft)" : "rgba(255,255,255,0.06)",
                color: isActive ? "var(--accent)" : "var(--muted)",
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

  // Who the run belongs to — a team instance has "team", an individual one
  // has "player" instead. Surfaced as a subtitle since "challenge" is now
  // doing double duty as the card's title.
  const runBy = pick(record, ["team", "player"].filter((k) => k !== title?.key));

  const extraFields = Object.entries(record).filter(
    ([key, value]) =>
      value &&
      !HIDDEN_FIELDS.has(key) &&
      key !== title?.key &&
      key !== description?.key &&
      key !== runBy?.key &&
      key !== stateKey
  );

  return (
    <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
            {title?.value ?? "Untitled instance"}
          </h3>
          {runBy && (
            <p className="mono" style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 0" }}>
              {formatStateLabel(runBy.key)}: {runBy.value}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {stateValue && (
            <span
              className="mono status-pill"
              style={{ color: "var(--accent)", borderColor: "var(--hairline)" }}
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
        <div className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>
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
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {expanded ? "Hide" : "Show"} all fields ({extraFields.length})
          </button>

          {expanded && (
            <dl style={{ marginTop: 10, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
              {extraFields.map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
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

// --- Create-record modal ----------------------------------------------
//
// Fields are read from sys_dictionary (via /api/challenge-instances/schema)
// so the form matches the real table shape: reference fields become a
// search-as-you-type picker that only ever submits a real sys_id, choice
// fields become a dropdown of the actual choice list, dates/booleans get
// proper inputs. If schema introspection fails (e.g. no read access to
// sys_dictionary), it falls back to plain text rows like before.

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
  label?: string;
  type?: string;
  reference?: string;
  choices?: ChoiceOption[];
  mandatory?: boolean;
  editableKey: boolean;
};

// Fields ServiceNow computes on its own (from the selected Challenge, or
// once "Start Challenge" runs) — left out of the create form entirely
// rather than guessed at here.
const EXCLUDED_FIELDS = new Set(["start_date", "end_date", "points", "state"]);

let rowIdCounter = 0;
function nextRowId() {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

function emptyRow(): FieldRow {
  return { id: nextRowId(), key: "", value: "", editableKey: true };
}

function rowFromSchema(field: FieldSchema): FieldRow {
  return {
    id: nextRowId(),
    key: field.element,
    value: "",
    label: field.label,
    type: field.type,
    // Defensive: some instances resolve this to an object even when the
    // schema endpoint asks for a plain string — never let that leak into
    // a lookup URL as "[object Object]".
    reference: typeof field.reference === "string" ? field.reference : undefined,
    choices: field.choices && field.choices.length > 0 ? field.choices : undefined,
    mandatory: field.mandatory,
    editableKey: false,
  };
}

const NUMERIC_TYPES = new Set(["integer", "decimal", "float", "longint"]);

// Converts a row's stored value into whatever ServiceNow's Table API
// expects for that field's type at submit time.
function formatForSubmit(row: FieldRow): string {
  if (row.type === "glide_date_time" && row.value) {
    // <input type="datetime-local"> gives "YYYY-MM-DDTHH:mm" — SN wants
    // "YYYY-MM-DD HH:mm:ss".
    const withSeconds = row.value.length === 16 ? `${row.value}:00` : row.value;
    return withSeconds.replace("T", " ");
  }
  return row.value;
}

type RefSearchState = { query: string; results: LookupResult[]; loading: boolean; open: boolean };

function CreateInstanceModal({
  fallbackFields,
  onClose,
  onCreated,
}: {
  fallbackFields: string[];
  onClose: () => void;
  onCreated: (record: Challenge) => void;
}) {
  const [schemaStatus, setSchemaStatus] = useState<"loading" | "ready" | "error">("loading");
  const [rows, setRows] = useState<FieldRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [refSearch, setRefSearch] = useState<Record<string, RefSearchState>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    fetch("/api/challenge-instances/schema")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const fields: FieldSchema[] = (data.result ?? []).filter(
          (f: FieldSchema) => !EXCLUDED_FIELDS.has(f.element)
        );
        if (fields.length === 0) throw new Error("No fields returned.");
        setRows(fields.map(rowFromSchema));
        setSchemaStatus("ready");
      })
      .catch(() => {
        const filtered = fallbackFields.filter((key) => !EXCLUDED_FIELDS.has(key));
        setRows(
          filtered.length > 0
            ? filtered.map((key) => ({ ...emptyRow(), key, editableKey: false }))
            : [emptyRow()]
        );
        setSchemaStatus("error");
      });
    // Only run once, on mount — fallbackFields is a snapshot from when the
    // modal opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  function updateRow(id: string, patch: Partial<FieldRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setRefSearch((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function runLookup(row: FieldRow, term: string) {
    if (!row.reference) return;

    setRefSearch((prev) => ({
      ...prev,
      [row.id]: { query: term, results: prev[row.id]?.results ?? [], loading: true, open: true },
    }));

    if (debounceTimers.current[row.id]) clearTimeout(debounceTimers.current[row.id]);
    debounceTimers.current[row.id] = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/lookup?table=${encodeURIComponent(row.reference!)}&q=${encodeURIComponent(term)}`
        );
        const data = await res.json();
        const results: LookupResult[] = data.result ?? [];
        setRefSearch((prev) => ({ ...prev, [row.id]: { query: term, results, loading: false, open: true } }));
      } catch {
        setRefSearch((prev) => ({ ...prev, [row.id]: { query: term, results: [], loading: false, open: true } }));
      }
    }, 300);
  }

  function selectLookupResult(row: FieldRow, result: LookupResult) {
    updateRow(row.id, { value: result.sys_id, displayValue: result.label });
    setRefSearch((prev) => ({ ...prev, [row.id]: { query: result.label, results: [], loading: false, open: false } }));

    // Player and Team are mutually exclusive — picking one clears the other.
    if (row.key === "player") {
      const teamRow = rows.find((r) => r.key === "team");
      if (teamRow) updateRow(teamRow.id, { value: "", displayValue: undefined });
    } else if (row.key === "team") {
      const playerRow = rows.find((r) => r.key === "player");
      if (playerRow) updateRow(playerRow.id, { value: "", displayValue: undefined });
    }
  }

  function closeLookup(rowId: string) {
    setRefSearch((prev) => {
      const current = prev[rowId];
      if (!current) return prev;
      return { ...prev, [rowId]: { ...current, open: false } };
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    const body: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (!key) continue;
      // Reference fields only get sent once a real record was picked from
      // the lookup — free text never lands in a reference column.
      if (row.reference && !row.value) continue;
      const value = formatForSubmit(row);
      if (value) body[key] = value;
    }

    if (Object.keys(body).length === 0) {
      setError("Add at least one field before saving.");
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
      onCreated((data.result ?? {}) as Challenge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create challenge instance"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 8, 14, 0.72)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px",
        overflowY: "auto",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="modal-surface"
        style={{ width: "100%", maxWidth: 560, padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>
              x_trhrt_trh_plus_challenge_instance
            </p>
            <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>New challenge instance</h2>
            {schemaStatus === "error" && (
              <p className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Couldn&apos;t read the table schema — showing plain fields instead.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "1px solid var(--hairline)",
              color: "var(--muted)",
              borderRadius: 4,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {schemaStatus === "loading" ? (
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>Reading table schema…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {rows.map((row) => {
                const playerValue = rows.find((r) => r.key === "player")?.value;
                const teamValue = rows.find((r) => r.key === "team")?.value;
                const blocked =
                  (row.key === "player" && !!teamValue) || (row.key === "team" && !!playerValue);

                return (
                  <FieldRowInput
                    key={row.id}
                    row={row}
                    search={refSearch[row.id]}
                    disabled={blocked}
                    onChangeKey={(key) => updateRow(row.id, { key })}
                    onChangeValue={(value) => updateRow(row.id, { value, displayValue: undefined })}
                    onSearch={(term) => runLookup(row, term)}
                    onSelectResult={(result) => selectLookupResult(row, result)}
                    onBlurSearch={() => closeLookup(row.id)}
                    onRemove={() => removeRow(row.id)}
                  />
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={addRow}
            className="mono"
            style={{
              background: "none",
              border: "1px dashed var(--hairline)",
              color: "var(--muted)",
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 4,
              cursor: "pointer",
              marginBottom: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Plus size={12} aria-hidden />
            Add field
          </button>

          {error && (
            <p className="mono" style={{ color: "var(--bad)", fontSize: 12.5, marginBottom: 12 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="mono"
              style={{
                background: "none",
                border: "1px solid var(--hairline)",
                color: "var(--muted)",
                padding: "9px 16px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || schemaStatus === "loading"}
              className="mono"
              style={{
                background: "var(--accent)",
                border: "1px solid var(--accent)",
                color: "var(--ink)",
                padding: "9px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Sending…" : "Create in ServiceNow"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const fieldInputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--ink)",
  border: "1px solid var(--hairline)",
  borderRadius: 4,
  color: "var(--paper)",
  fontSize: 13,
  outline: "none",
};

function FieldRowInput({
  row,
  search,
  disabled,
  onChangeKey,
  onChangeValue,
  onSearch,
  onSelectResult,
  onBlurSearch,
  onRemove,
}: {
  row: FieldRow;
  search?: RefSearchState;
  disabled?: boolean;
  onChangeKey: (key: string) => void;
  onChangeValue: (value: string) => void;
  onSearch: (term: string) => void;
  onSelectResult: (result: LookupResult) => void;
  onBlurSearch: () => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      {row.editableKey ? (
        <input
          value={row.key}
          onChange={(e) => onChangeKey(e.target.value)}
          placeholder="field name"
          className="mono"
          style={{ ...fieldInputStyle, width: "38%", fontSize: 12.5 }}
        />
      ) : (
        <label
          className="mono"
          style={{
            width: "38%",
            fontSize: 12,
            color: "var(--muted)",
            paddingTop: 9,
            flexShrink: 0,
          }}
        >
          {row.label}
          {row.mandatory && <span style={{ color: "var(--bad)", marginLeft: 4 }}>*</span>}
          {disabled && (
            <span style={{ display: "block", fontSize: 12, color: "var(--muted)", opacity: 0.8 }}>
              cleared — pick one
            </span>
          )}
        </label>
      )}

      <div style={{ flex: 1, position: "relative" }}>
        {row.reference ? (
          <>
            <input
              value={row.displayValue ?? search?.query ?? ""}
              onChange={(e) => {
                onChangeValue("");
                onSearch(e.target.value);
              }}
              onFocus={(e) => !disabled && onSearch(e.target.value)}
              onBlur={() => setTimeout(onBlurSearch, 150)}
              disabled={disabled}
              placeholder={disabled ? "Blocked — clear the other field" : `Search ${row.reference}…`}
              style={{
                ...fieldInputStyle,
                paddingRight: row.value ? 28 : undefined,
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? "not-allowed" : "text",
              }}
            />
            {row.value && !disabled && (
              <button
                type="button"
                onClick={() => onChangeValue("")}
                aria-label="Clear selection"
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                ×
              </button>
            )}
            {search?.open && (search.loading || search.results.length > 0) && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "var(--ink)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 4,
                  maxHeight: 170,
                  overflowY: "auto",
                  zIndex: 60,
                }}
              >
                {search.loading ? (
                  <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--muted)" }}>Searching…</div>
                ) : (
                  search.results.map((r) => (
                    <button
                      key={r.sys_id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSelectResult(r)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 10px",
                        background: "none",
                        border: "none",
                        color: "var(--paper)",
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      {r.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        ) : row.choices ? (
          <select value={row.value} onChange={(e) => onChangeValue(e.target.value)} style={fieldInputStyle}>
            <option value="">—</option>
            {row.choices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        ) : row.type === "boolean" ? (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              border: "1px solid var(--hairline)",
              borderRadius: 4,
              background: "var(--ink)",
            }}
          >
            <input
              type="checkbox"
              checked={row.value === "true"}
              onChange={(e) => onChangeValue(e.target.checked ? "true" : "false")}
            />
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {row.value === "true" ? "True" : "False"}
            </span>
          </label>
        ) : row.type === "glide_date" ? (
          <input
            type="date"
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
            style={fieldInputStyle}
          />
        ) : row.type === "glide_date_time" ? (
          <input
            type="datetime-local"
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
            style={fieldInputStyle}
          />
        ) : NUMERIC_TYPES.has(row.type ?? "") ? (
          <input
            type="number"
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
            placeholder="value"
            style={fieldInputStyle}
          />
        ) : (
          <input
            value={row.value}
            onChange={(e) => onChangeValue(e.target.value)}
            placeholder="value"
            style={fieldInputStyle}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove field"
        style={{
          background: "none",
          border: "1px solid var(--hairline)",
          color: "var(--muted)",
          borderRadius: 4,
          width: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}

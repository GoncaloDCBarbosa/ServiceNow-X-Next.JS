"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import {
  Badge,
  ErrorState,
  LinkedValue,
  OpenHeader,
  OpenableRow,
  PageHeader,
  RecordLink,
  useResource,
} from "./ui";
import {
  detectStageField,
  fieldLabel,
  formatValue,
  isSystemField,
  listHref,
  numericColumns,
  recordHref,
  recordTitle,
  stageLabel,
  stageTone,
  tableLabel,
  tableTitle,
} from "@/lib/domain";
import {
  REF_PREFIX,
  normalizeRecords,
  type RecordField,
} from "@/lib/sn-format";

/* ==========================================================================
   The record loader.

   One page that opens any record — a challenge, a challenge instance, a
   player, a team, a person — laid out the way ServiceNow lays out a form:
   every field with its label, references that lead to their own record, and
   the records that point back at this one underneath.

   It knows nothing about any table in particular. The route hands it a
   table and an id; the API hands back the fields; this component decides
   how each one reads. A table added to the app later opens here unchanged.
   ========================================================================== */

type Loaded = { table: string; sys_id: string; fields: RecordField[] };

type Related = {
  table: string;
  field: string;
  rows: Record<string, unknown>[];
  more: boolean;
  failed?: boolean;
};

/* Fields read in this order: what names the record, then whoever it belongs
   to, then its stage, then everything else; long free text goes last. */
const LEAD_FIELDS = ["name", "number", "challenge", "player", "team", "user"];

function orderFields(fields: RecordField[], stageKey: string | null): RecordField[] {
  const rank = (f: RecordField) => {
    if (f.type === "text") return 3;
    const lead = LEAD_FIELDS.indexOf(f.key);
    if (lead !== -1) return -2 + lead / 100;
    if (f.key === stageKey) return -1;
    return 1;
  };
  // Array.sort is stable, so fields of equal rank keep ServiceNow's own order.
  return [...fields].sort((a, b) => rank(a) - rank(b));
}

/** What a field shows: durations read from the raw value, the rest from the label. */
function shownValue(field: RecordField): string {
  const raw = field.type === "glide_duration" ? field.value : field.display || field.value;
  return raw;
}

export function RecordView({ table, sysId }: { table: string; sysId: string }) {
  const record = useResource<Loaded>(
    `/api/record?table=${encodeURIComponent(table)}&sys_id=${encodeURIComponent(sysId)}`
  );
  const related = useResource<Related[]>(
    `/api/record/related?table=${encodeURIComponent(table)}&sys_id=${encodeURIComponent(sysId)}`
  );

  /* A flat, display-string copy of the record so the same helpers the list
     pages use (titles, stage detection) work here too. */
  const flat = useMemo(() => {
    const out: Record<string, string> = {};
    for (const field of record.data?.fields ?? []) {
      out[field.key] = shownValue(field);
      if (field.ref) out[`${REF_PREFIX}${field.key}`] = `${field.ref.table}/${field.ref.sysId}`;
    }
    return out;
  }, [record.data]);

  const stageKey = useMemo(() => detectStageField([flat]), [flat]);
  const fields = useMemo(
    () => orderFields(record.data?.fields ?? [], stageKey),
    [record.data, stageKey]
  );

  const kind = tableTitle(table);
  const listPage = listHref(table);
  const title = record.state === "ready" ? recordTitle(table, flat) : kind;

  const eyebrow = (
    <nav aria-label="Breadcrumb" className="crumbs">
      {listPage ? (
        <Link href={listPage} className="crumb-link">
          <ArrowLeft size={13} strokeWidth={2} aria-hidden />
          {tableTitle(table, true)}
        </Link>
      ) : (
        <span>{tableTitle(table, true)}</span>
      )}
      {record.state === "ready" && (
        <>
          <ChevronRight size={12} strokeWidth={2} aria-hidden />
          <span aria-current="page">{title}</span>
        </>
      )}
    </nav>
  );

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={record.state === "error" ? `${kind} unavailable` : title}
        description={record.state === "ready" ? kind : undefined}
      />

      <div className="work-inner page-body record-body">
        {record.state === "loading" && <RecordSkeleton />}

        {record.state === "error" && (
          <ErrorState
            title={`This ${tableLabel(table)} could not be opened`}
            message={record.error}
          />
        )}

        {record.state === "ready" && (
          <section className="panel" aria-label={`${kind} details`}>
            <div className="panel-head">
              <h2 className="panel-title">Details</h2>
            </div>
            <dl className="record-form">
              {fields.map((field) => (
                <FieldRow key={field.key} field={field} isStage={field.key === stageKey} />
              ))}
            </dl>
          </section>
        )}

        {record.state === "ready" && related.state === "ready" && (
          <>
            {(related.data ?? []).map((list) => (
              <RelatedList
                key={`${list.table}:${list.field}`}
                list={list}
                duplicate={
                  (related.data ?? []).filter((l) => l.table === list.table).length > 1
                }
              />
            ))}
          </>
        )}

        {record.state === "ready" && related.state === "loading" && (
          <div className="panel" aria-hidden>
            <div className="panel-body">
              <span className="skeleton" style={{ display: "block", height: 12, width: "30%" }} />
            </div>
          </div>
        )}

        {record.state === "ready" && related.state === "error" && (
          <p className="panel-note">Related records could not be loaded.</p>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   One field, the way a form row reads
   -------------------------------------------------------------------------- */

function FieldRow({ field, isStage }: { field: RecordField; isStage: boolean }) {
  const text = shownValue(field);
  const label = fieldLabel(field.key, field.label);
  const long = field.type === "text";

  let content: React.ReactNode;
  if (!text) {
    content = <span className="record-empty">—</span>;
  } else if (field.ref) {
    content = (
      <RecordLink href={recordHref(field.ref.table, field.ref.sysId)}>{text}</RecordLink>
    );
  } else if (isStage) {
    content = <Badge tone={stageTone(text)}>{stageLabel(text)}</Badge>;
  } else if (long) {
    content = <span className="record-long">{text}</span>;
  } else {
    content = formatValue(text);
  }

  return (
    <div className="record-row" data-wide={long || undefined}>
      <dt className="record-label">
        {label}
        {field.mandatory && (
          <span className="field-required" aria-hidden>
            *
          </span>
        )}
      </dt>
      <dd className="record-value">{content}</dd>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Related records — ServiceNow's related lists
   -------------------------------------------------------------------------- */

const RELATED_PREFERRED = [
  "name",
  "challenge",
  "player",
  "team",
  "user",
  "level",
  "state",
  "start_date",
  "end_date",
  "points",
];
const RELATED_MAX_COLUMNS = 5;

function RelatedList({ list, duplicate }: { list: Related; duplicate: boolean }) {
  const rows = useMemo(() => normalizeRecords(list.rows), [list.rows]);

  const stageField = useMemo(() => detectStageField(rows), [rows]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        // The column that points back at the record being viewed says
        // nothing new on its own page.
        if (!isSystemField(key) && key !== list.field) keys.add(key);
      }
    }
    const preferred = RELATED_PREFERRED.filter((k) => keys.has(k));
    const rest = [...keys].filter((k) => !preferred.includes(k));
    return [...preferred, ...rest].slice(0, RELATED_MAX_COLUMNS);
  }, [rows, list.field]);

  const numeric = useMemo(() => numericColumns(rows, columns), [rows, columns]);

  const heading =
    tableTitle(list.table, true) + (duplicate ? ` · by ${fieldLabel(list.field).toLowerCase()}` : "");

  return (
    <section className="panel" aria-label={heading}>
      <div className="panel-head">
        <h2 className="panel-title">{heading}</h2>
        <span className="panel-note">
          {list.failed ? "Could not be loaded" : `${rows.length}${list.more ? "+" : ""}`}
        </span>
      </div>

      {rows.length > 0 && (
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
              {rows.map((row, i) => (
                <OpenableRow
                  key={row.sys_id ?? i}
                  href={row.sys_id ? recordHref(list.table, row.sys_id) : null}
                  label={recordTitle(list.table, row)}
                >
                  {columns.map((column, index) => (
                    <td
                      key={column}
                      className={[numeric.has(column) ? "num" : "", index === 0 ? "primary" : ""]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {column === stageField && row[column] ? (
                        <Badge tone={stageTone(row[column])}>{stageLabel(row[column])}</Badge>
                      ) : (
                        <LinkedValue record={row} column={column} />
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
  );
}

function RecordSkeleton() {
  return (
    <div className="panel" aria-hidden>
      <div className="panel-head">
        <span className="skeleton" style={{ display: "block", height: 12, width: 64 }} />
      </div>
      <div className="record-form">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="record-row">
            <span className="skeleton" style={{ display: "block", height: 11, width: "50%" }} />
            <span className="skeleton" style={{ display: "block", height: 13, width: "70%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

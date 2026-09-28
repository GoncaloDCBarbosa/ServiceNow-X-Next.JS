"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleAlert, Inbox, Search } from "lucide-react";
import { normalizeRecords, recordRef } from "@/lib/sn-format";
import { formatValue, recordHref, scrubMessage, type Tone } from "@/lib/domain";
import { useConnection } from "./connection";

/* -------------------------------------------------------------------------
   Page header
   ------------------------------------------------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Small line above the title — a breadcrumb on record pages. */
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="work-inner page-head-inner">
        <div>
          {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-sub">{description}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------
   Badge
   ------------------------------------------------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  plain = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  plain?: boolean;
}) {
  return (
    <span className="badge" data-tone={tone} data-plain={plain || undefined}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------
   Empty / error / loading
   ------------------------------------------------------------------------- */

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state">
      <Inbox size={22} strokeWidth={1.5} aria-hidden style={{ color: "var(--ink-3)" }} />
      <p className="state-title" style={{ marginTop: 10 }}>
        {title}
      </p>
      <p className="state-text">{text}</p>
      {action && <div className="state-action">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="state" data-tone="critical" role="alert">
      <p className="state-title">
        <CircleAlert size={14} strokeWidth={2} aria-hidden style={{ verticalAlign: "-2px", marginRight: 6 }} />
        {title}
      </p>
      <p className="state-text">{scrubMessage(message)}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="panel" aria-hidden>
      <table className="table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c}>
                  <span
                    className="skeleton"
                    style={{ display: "block", height: 12, width: c === 0 ? "60%" : "38%" }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="cards" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ height: 156 }}>
          <span className="skeleton" style={{ height: 14, width: "55%" }} />
          <span className="skeleton" style={{ height: 11, width: "88%" }} />
          <span className="skeleton" style={{ height: 11, width: "72%" }} />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Search box
   ------------------------------------------------------------------------- */

export function SearchBox({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <div className="search">
      <Search size={14} strokeWidth={2} aria-hidden />
      <input
        type="search"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
   Stage filter
   ------------------------------------------------------------------------- */

export type FilterOption = { key: string; label: string; count: number };

export function StageFilter({
  options,
  active,
  onChange,
  label,
}: {
  options: FilterOption[];
  active: string;
  onChange: (key: string) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className="segment"
          aria-pressed={option.key === active}
          onClick={() => onChange(option.key)}
        >
          {option.label}
          <span className="segment-count">{option.count}</span>
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Records hook — one fetch path for every list screen, so loading, errors
   and the rail's connection indicator behave identically everywhere.
   ------------------------------------------------------------------------- */

export type LoadState = "loading" | "ready" | "error";

export function useRecords(url: string) {
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string>();
  const { report } = useConnection();

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        if (cancelled) return;
        setRecords(normalizeRecords(data.result ?? []));
        setState("ready");
        report("live");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : undefined);
        setState("error");
        report("down");
      });

    return () => {
      cancelled = true;
    };
  }, [url, report]);

  return { records, setRecords, state, error };
}

/* -------------------------------------------------------------------------
   Links into the record loader page (/record/<type>/<id>)
   ------------------------------------------------------------------------- */

/** A link that opens a record. Stops the click reaching a clickable row. */
export function RecordLink({
  href,
  children,
  className = "record-link",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  );
}

/**
 * A table cell's text for one column. If the column is a reference (a
 * challenge, a player, a team...) the text opens the record it refers to;
 * otherwise it is formatted like any other value.
 */
export function LinkedValue({
  record,
  column,
}: {
  record: Record<string, string>;
  column: string;
}) {
  const text = formatValue(record[column]);
  const ref = record[column] ? recordRef(record, column) : null;
  return ref ? <RecordLink href={recordHref(ref.table, ref.sysId)}>{text}</RecordLink> : <>{text}</>;
}

/** Heading cell for the trailing "open" column that OpenableRow adds. */
export function OpenHeader() {
  return (
    <th className="row-open">
      <span className="sr-only">Open</span>
    </th>
  );
}

/**
 * A table row that opens its own record — the whole row is clickable, and
 * the trailing chevron is the keyboard and screen-reader route to the same
 * place. Links inside the cells (a challenge, a player) still win the click.
 */
export function OpenableRow({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <tr
      className={href ? "row-clickable" : undefined}
      onClick={href ? () => router.push(href) : undefined}
    >
      {children}
      <td className="row-open">
        {href && (
          <Link
            href={href}
            aria-label={`Open ${label}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronRight size={15} strokeWidth={1.75} aria-hidden />
          </Link>
        )}
      </td>
    </tr>
  );
}

/* -------------------------------------------------------------------------
   Single-resource hook — for pages that load one object rather than a list
   (a record, a profile). Same loading / error / connection behaviour as
   useRecords.
   ------------------------------------------------------------------------- */

export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string>();
  const { report } = useConnection();

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then((res) => res.json())
      .then((body) => {
        if (body.error) throw new Error(body.error);
        if (cancelled) return;
        setData(body.result as T);
        setState("ready");
        report("live");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : undefined);
        setState("error");
        report("down");
      });

    return () => {
      cancelled = true;
    };
  }, [url, report]);

  return { data, state, error };
}

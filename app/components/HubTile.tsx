"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export type FetchState = "loading" | "ready" | "error";

interface HubTileProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  table: string;
  status: FetchState;
  preview: string[];
  errorMessage?: string;
}

export function HubTile({
  href,
  icon: Icon,
  title,
  description,
  table,
  status,
  preview,
  errorMessage,
}: HubTileProps) {
  return (
    <Link href={href} className="tile" style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div className="tile-icon" aria-hidden>
          <Icon size={20} strokeWidth={1.75} />
        </div>
        <span className="eyebrow">{table}</span>
      </div>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 6px" }}>
          {title}
        </h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 14 }}>
        <div className="caption" style={{ marginBottom: 8 }}>
          Latest records
        </div>

        {status === "loading" && (
          <div className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
            Connecting…
          </div>
        )}

        {status === "error" && (
          <div className="mono" style={{ fontSize: 13, color: "var(--bad)" }}>
            {errorMessage ?? "Unable to reach ServiceNow."}
          </div>
        )}

        {status === "ready" && preview.length === 0 && (
          <div className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
            No records yet.
          </div>
        )}

        {status === "ready" && preview.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {preview.map((item, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13.5,
                  color: "var(--paper)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                · {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="mono"
        style={{
          fontSize: 13,
          color: "var(--accent)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Open {title}
        <ArrowRight size={14} aria-hidden />
      </div>
    </Link>
  );
}

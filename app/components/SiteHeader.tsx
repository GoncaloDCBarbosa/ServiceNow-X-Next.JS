import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SiteHeaderProps {
  back?: { href: string; label: string };
}

export function SiteHeader({ back }: SiteHeaderProps) {
  return (
    <header className="container" style={{ paddingTop: 28, paddingBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
        >
          {/* Official TRH icon mark (logos/svg/trh-logo-icon-primary-light-dark-bg.svg) —
              square placement, brand cyan, ≥32px per rules/brand.md minimum size. */}
          <span
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image src="/brand/trh-logo-icon.svg" alt="TRH" width={36} height={37} priority />
          </span>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: 15 }}>
              TRH Plus
            </span>
            <span className="caption" style={{ fontSize: 12 }}>
              Gamification Console
            </span>
          </span>
        </Link>

        {back ? (
          <Link
            href={back.href}
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--muted)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} aria-hidden />
            {back.label}
          </Link>
        ) : (
          <span className="eyebrow">x_trhrt_trh_plus</span>
        )}
      </div>
    </header>
  );
}

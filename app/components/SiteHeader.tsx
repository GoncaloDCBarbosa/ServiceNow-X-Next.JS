import Link from "next/link";

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
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
        >
          <span
            className="mono"
            aria-hidden
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--amber), var(--violet))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            +
          </span>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: 15 }}>
              TRH Plus
            </span>
            <span className="eyebrow" style={{ fontSize: 10 }}>
              Gamification Console
            </span>
          </span>
        </Link>

        {back ? (
          <Link
            href={back.href}
            className="mono"
            style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}
          >
            ← {back.label}
          </Link>
        ) : (
          <span className="eyebrow">x_trhrt_trh_plus</span>
        )}
      </div>
    </header>
  );
}

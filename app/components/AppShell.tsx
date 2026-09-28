"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Gamepad2, LayoutGrid, Trophy, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TABLES, listHref, tableFromSlug, tableTitle } from "@/lib/domain";
import { ConnectionProvider, useConnection } from "./connection";

type NavEntry = { href: string; label: string; icon: LucideIcon };

/* Navigation is named after what the program manager is looking at, never
   after the table it comes from. */
const PRIMARY: NavEntry[] = [{ href: "/", label: "Overview", icon: LayoutGrid }];

const PROGRAMME: NavEntry[] = [
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/challenge-instances", label: tableTitle(TABLES.participation, true), icon: Activity },
];

const PEOPLE: NavEntry[] = [
  { href: "/players", label: "Players", icon: Gamepad2 },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function NavLink({ entry, active }: { entry: NavEntry; active: boolean }) {
  const Icon = entry.icon;
  return (
    <Link href={entry.href} className="nav-item" aria-current={active ? "page" : undefined}>
      <Icon size={16} strokeWidth={1.75} aria-hidden />
      {entry.label}
    </Link>
  );
}

const CONNECTION_TEXT: Record<string, string> = {
  unknown: "Checking ServiceNow",
  live: "Connected to ServiceNow",
  down: "ServiceNow unreachable",
};

function ConnectionIndicator() {
  const { state, checkedAt } = useConnection();
  return (
    <p className="rail-foot">
      <span className="conn-dot" data-state={state} aria-hidden />
      <span>
        {CONNECTION_TEXT[state]}
        {checkedAt && (
          <span className="sr-only">
            {" "}
            as of {checkedAt.toLocaleTimeString()}
          </span>
        )}
      </span>
    </p>
  );
}

function Rail() {
  const pathname = usePathname();
  // A record page (/record/<type>/<id>) belongs to the section its list is in.
  const recordList = (() => {
    const [, root, type] = pathname.split("/");
    if (root !== "record" || !type) return null;
    const table = tableFromSlug(type);
    return table ? listHref(table) : null;
  })();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) || href === recordList;

  return (
    <nav className="rail" aria-label="Sections">
      <Link href="/" className="rail-brand">
        <Image src="/brand/trh-logo-icon.svg" alt="" width={28} height={29} priority />
        <span>
          <span className="rail-brand-name">TRH Plus</span>
          <br />
          <span className="rail-brand-sub">Gamification</span>
        </span>
      </Link>

      <div className="rail-nav">
        {PRIMARY.map((e) => (
          <NavLink key={e.href} entry={e} active={isActive(e.href)} />
        ))}

        <p className="rail-group">Programme</p>
        {PROGRAMME.map((e) => (
          <NavLink key={e.href} entry={e} active={isActive(e.href)} />
        ))}

        <p className="rail-group">People</p>
        {PEOPLE.map((e) => (
          <NavLink key={e.href} entry={e} active={isActive(e.href)} />
        ))}
      </div>

      <ConnectionIndicator />
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider>
      <div className="shell">
        <Rail />
        <div className="work">{children}</div>
      </div>
    </ConnectionProvider>
  );
}

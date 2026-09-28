/**
 * Domain vocabulary.
 *
 * Everything the ServiceNow Table API returns is named the way the platform
 * names things: scoped table names (x_trhrt_trh_plus_*), snake_case columns,
 * "true"/"false" strings, epoch-pinned durations. None of that belongs in
 * front of a program manager, so every technical identifier is translated
 * here — in one place — and the pages only ever render the result.
 */

// --- Tables ------------------------------------------------------------

export const TABLES = {
  challenge: "x_trhrt_trh_plus_challenge",
  participation: "x_trhrt_trh_plus_challenge_instance",
  player: "x_trhrt_trh_plus_player",
  user: "sys_user",
  team: "x_trhrt_trh_plus_team",
} as const;

/** Business name for a table, singular. Used in prose and placeholders. */
const TABLE_LABELS: Record<string, { one: string; many: string }> = {
  [TABLES.challenge]: { one: "challenge", many: "challenges" },
  // Shown under the platform's own name, so what people see in the console
  // matches what they see in ServiceNow. Change it here and every heading,
  // placeholder and empty state follows.
  [TABLES.participation]: { one: "challenge instance", many: "challenge instances" },
  [TABLES.player]: { one: "player", many: "players" },
  [TABLES.team]: { one: "team", many: "teams" },
  sys_user: { one: "person", many: "people" },
  sys_user_group: { one: "group", many: "groups" },
};

export function tableLabel(table: string, plural = false): string {
  const entry = TABLE_LABELS[table];
  if (entry) return plural ? entry.many : entry.one;
  // Unknown table: strip the scope prefix and humanise what's left, so even
  // a table added later never shows up as "x_trhrt_something".
  const stripped = table.replace(/^x_[a-z0-9]+_/, "").replace(/^sys_/, "");
  const human = humanise(stripped);
  return plural ? `${human.toLowerCase()}s` : human.toLowerCase();
}

/** Same as tableLabel, in title case for headings, navigation and breadcrumbs. */
export function tableTitle(table: string, plural = false): string {
  return tableLabel(table, plural).replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// --- Record pages ------------------------------------------------------

/**
 * The record loader lives at /record/<type>/<id>. The type is a friendly
 * slug rather than the table name; anything not listed here still resolves
 * as long as it is one of the programme's own tables (see isBrowsableTable),
 * so a table added to the app later needs no code change to be openable.
 */
const RECORD_SLUGS: Record<string, string> = {
  challenge: TABLES.challenge,
  "challenge-instance": TABLES.participation,
  player: TABLES.player,
  team: TABLES.team,
  person: TABLES.user,
  group: "sys_user_group",
};

/** Where each record type's list lives, for breadcrumbs and "back". */
const LIST_PAGES: Record<string, string> = {
  [TABLES.challenge]: "/challenges",
  [TABLES.participation]: "/challenge-instances",
  [TABLES.player]: "/players",
};

/** People and groups are read through an allow-list, never wholesale. */
export const PERSON_FIELDS = [
  "name",
  "user_name",
  "email",
  "title",
  "department",
  "manager",
  "phone",
  "mobile_phone",
  "location",
  "active",
];

const TABLE_NAME_PATTERN = /^[a-z0-9_]+$/i;

/**
 * The console reads with one shared integration account, so the record
 * loader is deliberately not a window onto the whole instance: only the
 * programme's own tables, plus people and groups, can be opened.
 */
export function isBrowsableTable(table: string): boolean {
  if (!TABLE_NAME_PATTERN.test(table)) return false;
  if (table === TABLES.user || table === "sys_user_group") return true;
  return table.startsWith("x_trhrt_");
}

export function tableFromSlug(slug: string): string | null {
  const table = RECORD_SLUGS[slug] ?? slug;
  return isBrowsableTable(table) ? table : null;
}

export function slugFromTable(table: string): string {
  const entry = Object.entries(RECORD_SLUGS).find(([, t]) => t === table);
  return entry ? entry[0] : table;
}

/** URL of the loader page for one record. */
export function recordHref(table: string, sysId: string): string {
  return `/record/${slugFromTable(table)}/${sysId}`;
}

export function listHref(table: string): string | null {
  return LIST_PAGES[table] ?? null;
}

/** Columns that name a record, in the order they are tried. */
const TITLE_FIELDS = ["name", "number", "short_description", "title"];

/** A readable name for one normalised record, whatever table it is from. */
export function recordTitle(table: string, record: Record<string, string>): string {
  for (const key of TITLE_FIELDS) {
    if (record[key]) return record[key];
  }
  // A player has no name of its own — it is named after the person it wraps.
  if (table === TABLES.player && record.user) return record.user;
  if (table === TABLES.participation) {
    const who = record.player || record.team || record.user;
    const parts = [record.challenge, who].filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
  }
  return `Untitled ${tableLabel(table)}`;
}

// --- Field labels ------------------------------------------------------

/** Curated labels win; anything else falls through to the humaniser. */
const FIELD_LABELS: Record<string, string> = {
  active: "Status",
  challenge: "Challenge",
  completed: "Completed",
  completed_on: "Completed on",
  description: "Description",
  email: "Email",
  end_date: "Ends",
  level: "Level",
  name: "Name",
  number: "Reference",
  player: "Player",
  point_value: "Points",
  points_reward: "Points reward",
  challenge_type: "Challenge type",
  duration_limit: "Duration limit",
  points: "Points",
  progress: "Progress",
  rank: "Rank",
  reward_points: "Points",
  score: "Score",
  short_description: "Summary",
  start_date: "Starts",
  state: "Stage",
  status: "Stage",
  target: "Target",
  team: "Team",
  title: "Job title",
  total_points: "Total points",
  user: "Person",
  user_name: "Username",
  u_points: "Points",
};

const ACRONYMS: Record<string, string> = {
  id: "ID",
  url: "URL",
  sla: "SLA",
  api: "API",
  crm: "CRM",
  kpi: "KPI",
};

function humanise(key: string): string {
  const words = key
    .replace(/^u_/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return key;

  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      if (i === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
      return lower;
    })
    .join(" ");
}

/**
 * Curated labels win, then the label ServiceNow's own dictionary gives the
 * column (when the caller has it), then a humanised version of the key.
 */
export function fieldLabel(key: string, dictionaryLabel?: string): string {
  return FIELD_LABELS[key] ?? (dictionaryLabel || humanise(key));
}

// --- Values ------------------------------------------------------------

/** Platform bookkeeping columns — never shown, on any screen. */
export const SYSTEM_FIELDS = new Set([
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

export function isSystemField(key: string): boolean {
  return SYSTEM_FIELDS.has(key) || key.startsWith("sys_");
}

const SYS_ID_PATTERN = /^[a-f0-9]{32}$/i;
// ServiceNow stores "duration" fields as a timestamp pinned to the epoch —
// only the clock part carries meaning.
const DURATION_PATTERN = /^1970-01-01[ T](\d{2}:\d{2}:\d{2})$/;
const ISO_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const EMPTY_VALUE = "—";

/**
 * Turns one raw field value into something readable. Returns EMPTY_VALUE for
 * anything blank so tables never render ragged empty cells.
 */
export function formatValue(value: string | undefined): string {
  if (value == null || value === "") return EMPTY_VALUE;

  const duration = value.match(DURATION_PATTERN);
  if (duration) return duration[1];

  const dateTime = value.match(ISO_DATETIME_PATTERN);
  if (dateTime) {
    const [, y, m, d, hh, mm] = dateTime;
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}, ${hh}:${mm}`;
  }

  const date = value.match(ISO_DATE_PATTERN);
  if (date) {
    const [, y, m, d] = date;
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  }

  if (value === "true") return "Yes";
  if (value === "false") return "No";

  // A bare sys_id means the label couldn't be resolved — a 32-char hex
  // string tells a program manager nothing, so it's suppressed.
  if (SYS_ID_PATTERN.test(value)) return EMPTY_VALUE;

  return value;
}

/** Right-align numeric columns; everything else reads left-to-right. */
export function isNumericValue(value: string | undefined): boolean {
  return !!value && /^-?\d+(\.\d+)?$/.test(value);
}

/**
 * Decides which columns hold numbers, from the records rather than from the
 * column name, so the heading and its cells always align the same way.
 */
export function numericColumns(
  records: Record<string, string>[],
  columns: string[]
): Set<string> {
  const numeric = new Set<string>();

  for (const column of columns) {
    const values = records.map((r) => r[column]).filter((v) => v);
    if (values.length > 0 && values.every(isNumericValue)) numeric.add(column);
  }

  return numeric;
}

// --- Lifecycle stages --------------------------------------------------

/** Whatever the custom app happens to call its lifecycle column. */
const STAGE_FIELDS = ["state", "u_state", "workflow_state", "status", "publish_state"];

export function detectStageField(records: Record<string, string>[]): string | null {
  for (const key of STAGE_FIELDS) {
    if (records.some((r) => r[key])) return key;
  }
  return null;
}

const STAGE_ORDER = [
  "draft",
  "pending",
  "not_started",
  "ready",
  "in_review",
  "review",
  "in_progress",
  "active",
  "published",
  "completed",
  "complete",
  "closed",
  "archived",
  "retired",
  "cancelled",
  "canceled",
  "failed",
];

export function sortStages(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const ia = STAGE_ORDER.indexOf(a.toLowerCase());
    const ib = STAGE_ORDER.indexOf(b.toLowerCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function stageLabel(value: string): string {
  return humanise(value);
}

export type Tone = "neutral" | "positive" | "progress" | "warning" | "critical";

/** Maps a stage onto the badge palette so colour carries meaning. */
export function stageTone(value: string): Tone {
  const v = value.toLowerCase();
  if (/(complete|done|published|won|achiev)/.test(v)) return "positive";
  if (/(progress|active|running|started|open)/.test(v)) return "progress";
  if (/(pending|review|draft|waiting|not_started)/.test(v)) return "warning";
  if (/(fail|cancel|expired|reject|abandon)/.test(v)) return "critical";
  return "neutral";
}

/** True when a stage means the run reached its end successfully. */
export function isCompletedStage(value: string): boolean {
  return /(complete|done|achiev)/i.test(value);
}

// --- Error messages ----------------------------------------------------

const SCOPED_TABLE_PATTERN = /\b(?:x_[a-z0-9]+_[a-z0-9_]+|sys_[a-z0-9_]+)\b/gi;

/**
 * ServiceNow error strings name the table that failed ("Insufficient rights
 * on x_trhrt_trh_plus_challenge"). Swap any such identifier for its business
 * name before the message reaches the screen.
 */
export function scrubMessage(message: string | undefined): string {
  if (!message) return "The connection to ServiceNow failed.";
  return message.replace(SCOPED_TABLE_PATTERN, (match) => tableLabel(match, true));
}

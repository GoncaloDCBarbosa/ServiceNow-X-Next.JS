# TRH Plus — Gamification Console

An operations console for the TRH Plus gamification programme, reading and
writing ServiceNow through the Table API. It is built for programme managers,
not for platform developers: nothing on screen is named the way ServiceNow
names it internally.

## Running it

```bash
npm install
npm run dev
```

Create `.env.local` with the credentials of a ServiceNow user that can read
the gamification tables, `sys_user` and `sys_dictionary`:

```
SN_INSTANCE=https://yourinstance.service-now.com
SN_USER=...
SN_PASSWORD=...
```

## Structure

```
app/
  page.tsx                  Overview — summary figures and challenge uptake
  challenges/               The challenge catalogue
  challenge-instances/      Participations, plus the create dialog
  players/                  Player profiles and scores
  users/                    Directory (sys_user)
  components/
    AppShell.tsx            Navigation rail and page frame
    connection.tsx          Live ServiceNow connection state
    ui.tsx                  Page header, badges, tables, filters, useRecords
  globals.css               The design system — tokens and components
  api/                      Route handlers; the only code that talks to SN
lib/
  servicenow.ts             Table API client (auth, errors, GET and POST)
  sn-format.ts              Unwraps { value, display_value } field objects
  domain.ts                 Platform vocabulary → business vocabulary
```

## Two rules worth keeping

**No technical identifiers on screen.** Table names, column names, sys_ids and
raw `true`/`false` values all pass through `lib/domain.ts` first. If you add a
screen, render values with `formatValue()` and headings with `fieldLabel()`,
and put any error message through `scrubMessage()` — ServiceNow error strings
name the table that failed. To rename something the interface shows, edit
`TABLE_LABELS` or `FIELD_LABELS` in that file; nothing else needs to change.

The one place the wording is deliberate rather than mechanical: the
`x_trhrt_trh_plus_challenge_instance` table is shown as **Participations**
throughout, since "instance" means nothing to the people using this. The URL
still says `/challenge-instances`.

**No inline styles.** Everything visual lives in `app/globals.css` as tokens
and component classes. Inline `style` is for values computed at runtime only —
a progress bar's width, for example.

## Schema assumptions

The pages do not hardcode the custom tables' columns; they read whatever the
Table API returns and order it by convention (identity first, lifecycle stage
next, scores last). The create dialog reads `sys_dictionary` so its form
matches the real table, and falls back to plain text fields if that read is
denied. Adding a column in ServiceNow therefore shows up here without a code
change — give it a label in `FIELD_LABELS` if the generated one reads badly.

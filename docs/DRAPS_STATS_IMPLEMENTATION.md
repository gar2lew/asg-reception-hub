# DRAPS Stats — Implementation Documentation

> ASG Reception Hub  
> Branch: `firebase-implementation`  
> Commit: `dc0fdbc`

## Purpose

The DRAPS Stats dashboard gives Reception staff a guided daily reporting
workflow for collecting and reviewing representative sales results.  The
official spreadsheet remains the manual destination for final figures in
this version; the app helps Reception organise, validate, and print the
numbers before copying them across.

---

## Terminology

### Daily DRAPS

| Field               | Description                         |
|---------------------|-------------------------------------|
| Door Questionnaires | Number of door questionnaires taken |
| Referrals           | Number of referrals received        |
| Appointments        | Number of appointments booked       |
| Presented           | Number of presentations delivered   |
| Sold                | Number of sales closed              |

### First Consult

| Field               | Description                                |
|---------------------|--------------------------------------------|
| Booked Appointments | Number of first-consult appointments made  |
| Presented           | Number of first-consult presentations done |
| Sold                | Number of first-consult sales closed       |

### Finance Run

| Field               | Description                                |
|---------------------|--------------------------------------------|
| Booked Appointments | Number of finance-run appointments made    |
| Presented           | Number of finance-run presentations done   |
| Sold                | Number of finance-run sales closed         |

---

## Section Statuses

Every representative's three sections (Daily DRAPS, First Consult,
Finance Run) are independently controlled by a status selector.

### Figures Supplied

- Numeric fields are enabled.
- Values are included in totals and conversion calculations.
- Blank fields remain `null`; zero is a valid supplied result.

### Not Supplied by Rep

- Every field displays `/`.
- Numeric inputs are disabled.
- The section is excluded from totals and percentages.
- The status is stored (not the slash character); numeric values are
  stored as `null`.

### Not Applicable Today

- Every field displays `N/A`.
- Numeric inputs are disabled.
- The section is excluded from totals and percentages.
- Not counted as a missing submission.

### Observation

- The section is labelled **Observation**.
- Numeric fields remain enabled.
- Entered values are included in totals and rates.
- The status is clearly identified in the printed report.

---

## Data Architecture

### Models

| File | Exports |
|---|---|
| `src/models/representative.ts` | `Representative`, `RepresentativeCreate` |
| `src/models/draps.ts` | `DailyDrapsReport`, `DailyRepResult`, `DrapsResultSection`, `FirstConsultResultSection`, `FinanceRunResultSection`, helper factories |

### Firestore Collections

| Collection | Document ID | Purpose |
|---|---|---|
| `representatives` | auto-generated UUID | Shared representative directory |
| `dailyDrapsReports` | auto-generated UUID | One document per report date + office |
| `dailyRepResults` | auto-generated UUID | Per-representative results within a report |

### Repositories

| Class | Collection |
|---|---|
| `FirebaseRepresentativeRepository` | `representatives` |
| `FirebaseDailyDrapsReportRepository` | `dailyDrapsReports` |
| `FirebaseDailyRepResultRepository` | `dailyRepResults` |

### Audit Fields

Every representative carries `createdByUid` / `createdByName` and
`updatedByUid` / `updatedByName`.  Reports carry the same plus
`completedBy*` and `reopenedBy*` fields.  Rep results snapshot the
representative name and office at save time so historical reports remain
valid after renaming or deactivation.

---

## Calculations

All calculation helpers live in `src/services/drapsCalculations.ts` and
are pure functions with no side effects.

### Totals

- **Daily DRAPS totals**: sum `doorQuestionnaires`, `referrals`,
  `appointments`, `presented`, `sold` across included sections.
- **First Consult totals**: sum `bookedAppointments`, `presented`,
  `sold`.
- **Finance Run totals**: same fields as First Consult.

Only sections with status `supplied` or `observation` are included.

### Conversion Rates

| Rate | Formula |
|---|---|
| DRAPS presentation | `Presented / Appointments` |
| DRAPS close | `Sold / Presented` |
| FC presentation | `Presented / Booked Appointments` |
| FC close | `Sold / Presented` |
| FR presentation | `Presented / Booked Appointments` |
| FR close | `Sold / Presented` |

### Zero and Unavailable Handling

- `0%` is displayed only when the denominator is genuinely supplied as
  zero **and** at least one section in the group has `supplied` or
  `observation` status.
- `—` (em dash) is displayed when all sections in a group are
  `not_supplied` or `not_applicable`, or when the numerator or
  denominator is `null`.
- No `NaN` or `Infinity` can ever be displayed.

---

## Workflow

### Select Date and Office

The `/draps` page defaults to today in Australian local time.  The
office filter determines which representatives appear and which report
is loaded/created.

### Enter Rep Results

Expand a representative card to see their three sections.  Each section
has a status selector and numeric fields.  Changes are held in local
state until explicitly saved.

### Save Draft

Clicking **Save Draft** creates a report if none exists, then persists
every representative result to Firestore.  A success message and last-saved
time are displayed.  Values are preserved if saving fails.

### Mark Complete

Clicking **Mark Complete** validates that every included section is
either fully supplied, `not_supplied`, `not_applicable`, or
`observation`.  An incomplete summary is shown if validation fails.
Completion records `completedAt`, `completedByUid`, and
`completedByName`.

### Reopen

Completed reports can be reopened with a confirmation prompt.
Reopening records `reopenedAt`, `reopenedByUid`, and `reopenedByName`.

### Previous Reports

`/draps/previous` lists all reports sorted newest-first.  Filters for
office and status are available.  Each row shows date, office, status,
representative count, and completed-by.  Actions: View, Reopen,
Print.

### Print / PDF

`/draps/print?reportId=...` renders an A4-formatted report with ASG
branding, a per-representative table, totals row, conversion rates, and
summary.  Use the browser Print dialog (Ctrl+P) → Save as PDF to
download.

---

## Permissions

Firestore Rules enforce the following:

### `isOperationalUser()`

```text
authenticated user
  AND active userProfiles/{uid} exists
  AND role IN ('administrator', 'reception')
```

### Representatives

- **Read**: `isOperationalUser()`
- **Create**: `isOperationalUser()`, name is string, office in allowed
  set, active is true
- **Update**: `isOperationalUser()`
- **Delete**: always denied (hard delete forbidden — deactivate via
  `active: false`)

### Daily DRAPS Reports

- **Read / Create / Update**: `isOperationalUser()`
- **Delete**: always denied

### Daily Rep Results

- **Read / Create / Update**: `isOperationalUser()`
- **Delete**: always denied

All other collections remain deny-by-default.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Loading | "Loading..." placeholder |
| Save success | Green success message + last-saved time |
| Save failure | Red error message; form values preserved |
| Duplicate submission | Button disabled while saving |
| Incomplete completion | Summary of missing sections; report not completed |
| Network / Firestore error | User-facing error message; diagnostic log to console |

---

## Known Limitations

- No Google Sheets integration — the spreadsheet is updated manually.
- No automated email sending.
- PDF download uses the browser Print dialog; there is no server-side
  PDF generation.
- Playwright smoke tests for DRAPS require secure credentials which are
  not yet configured.
- Representative archive/deactivate does not cascade to historical
  reports — name and office snapshots ensure past data remains readable.
- No bulk-import or CSV export for representatives.

# Dashboard Personalisation — ASG Reception Hub

## Widget Registry

9 widgets registered in `src/models/dashboard.ts`:

| Key | Label | Required | Default Size | Roles |
|-----|-------|----------|-------------|-------|
| progress | Today's Progress | Yes | medium | All |
| priority | Priority Tasks | No | medium | All |
| opening | Opening Routine | No | medium | Reception |
| upcoming | Upcoming Tasks | No | medium | All |
| stock | Low Stock Alerts | No | small | All |
| printing | Printing Reminders | No | small | All |
| quicklinks | Quick Links | No | small | All |
| contacts | Important Contacts | No | small | All |
| announcements | Announcements | Yes | medium | All |

## Layout Model

Widgets are rendered in a responsive CSS grid. Each widget has a defined size (small/medium/wide). Edit mode allows toggling visibility and reordering via move-up/move-down buttons. Drag-and-drop is not implemented — keyboard-accessible arrow controls are used instead.

## Preference Hierarchy

1. **Required system constraints** — `required: true` widgets cannot be hidden
2. **User preference** — saved via `DashboardPreferenceRepository`
3. **Organisation defaults** — `defaultWidgetConfigs()` function
4. **Hardcoded safe default** — defined in `DASHBOARD_WIDGETS` array

Malformed widget keys are silently ignored. Widget-level `ErrorBoundary` prevents one failing widget from crashing the entire dashboard.

## Widget Error Boundary

The `WidgetErrorBoundary` component wraps each widget independently. If a widget throws during rendering, the error is caught, logged, and a fallback message is shown in place of the widget. Other widgets continue working.

## User Controls

- Enter edit mode via "Edit Layout" button
- Toggle widgets on/off (required widgets are locked)
- Reorder with up/down arrows
- Reset to defaults
- Save or cancel changes

## Administrator Controls

Admins can configure organisation-wide default layouts (future: office-specific defaults). Announcements can be created and managed.

## Data Architecture

- `DashboardPreferenceRepository` (localStorage) — per-user dashboard preferences
- `DashboardPreference` model — widget configs, density, landing page
- `WidgetConfig` — per-widget enabled state, order, size, compact mode

## Known Limitations

1. No office-specific default layouts (admin feature pending)
2. No announcement creation UI
3. Widget catalogue shows all widgets regardless of role (filtering pending)
4. Size controls not wired (widgets use default sizes)
5. Firestore implementation pending

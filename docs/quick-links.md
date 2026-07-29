# Quick Links — ASG Reception Hub

## Data Model

### QuickLink

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| title | string | Display name |
| description | string? | Optional description |
| url | string | URL (validated) |
| categoryId | string? | Category reference |
| group | string | Group key (e.g. daily_systems) |
| iconKey | string? | Future icon support |
| scope | personal / office / organisation | Visibility |
| office | string? | Office scope |
| ownerUid | string | Creator UID |
| openBehaviour | same-tab / new-tab | Link target |
| pinned | boolean | Favourite |
| order | number | Display order |
| enabled | boolean | Active |
| archived | boolean? | Archived state |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |

### QuickLinkGroup

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | Group display name |
| scope | personal / organisation | Visibility |
| order | number | Display order |
| enabled | boolean | Active |

### UserLinkPreference

| Field | Type | Description |
|-------|------|-------------|
| linkId | string | Reference to QuickLink |
| userId | string | User UID |
| pinned | boolean | Favourite flag |
| personalLabel | string? | Custom display name |
| personalOrder | number? | Custom order |

## URL Security

Only https:, http:, mailto:, tel: protocols are allowed. javascript:, data:, file: are rejected. URLs containing HTML or script tags are rejected. Malformed URLs fall back to `#` via `safeUrl()`.

## Scope Model

- **Organisation** — visible to all authenticated users, managed by administrators
- **Personal** — owned by individual user, visible and editable only by that user
- User can pin any link as a favourite regardless of scope
- Personal labels on shared links use `UserLinkPreference` overlay records

## Permissions

| Action | Admin | Reception |
|--------|-------|-----------|
| View shared links | Yes | Yes |
| Pin/unpin any link | Yes | Yes |
| Create personal links | Yes | Yes |
| Edit own personal links | Yes | Yes |
| Archive own personal links | Yes | Yes |
| Create shared links | Yes | No |
| Edit shared links | Yes | No |
| Manage groups | Yes | No |

## Repository Architecture

- `IQuickLinkRepository` / `QuickLinkRepository` — link CRUD (existing)
- `IQuickLinkGroupRepository` / `QuickLinkGroupRepository` — group CRUD (new)
- `IUserLinkPreferenceRepository` — overlay preferences (interface exists, impl pending)

All implementations follow the localStorage pattern with namespaced keys (`asg_reception_*`).

## Migration from Current Seed

The existing 13 seeded links in `src/repositories/seed/quickLinks.ts` have been updated with scope, ownerUid, and enabled fields. They serve as the default shared links on first load.

# Daily Tasks — ASG Reception Hub

## Task Model

### UserTask (personal tasks)

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| title | string | Task name |
| description | string? | Optional details |
| categoryId | string? | User-assigned category |
| priority | low / normal / high | Task priority |
| dueDate | string? | ISO date (YYYY-MM-DD) |
| dueTime | string? | HH:MM time |
| order | number | Display order |
| recurrence | none / daily / weekdays / weekly / monthly | Recurrence rule |
| scope | "personal" | Always personal |
| ownerUid | string | Firebase Auth UID |
| completed | boolean | Completion state |
| completedAt | string? | ISO timestamp |
| archived | boolean | Archived state |
| archivedAt | string? | ISO timestamp |
| createdAt | string | ISO timestamp |
| updatedAt | string | ISO timestamp |

### TaskDefinition (shared templates)

Inherits from Phase A. Key additional fields: `scope`, `completionType`, `office`.

| Field | Type | Description |
|-------|------|-------------|
| scope | personal / office / organisation | Visibility |
| completionType | personal / team | Per-user or team-wide |
| office | string? | Office scope |

### TaskCompletion (shared task tracking)

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| taskDefinitionId | string | Reference to template |
| userId | string | Completing user |
| completedAt | string | ISO timestamp |
| completedBy | string | Actor UID |
| completionNote | string? | Optional note |
| reopenedAt | string? | ISO timestamp |
| reopenedBy | string? | Actor UID |

## Recurrence Strategy

Recurrence is resolved **materialised into instances** at the point of generation (via `generateDailyTasks()`).

Supported recurrence values:
- `none` — one-time task, never repeats
- `daily` — repeats every calendar day
- `weekdays` — repeats Monday through Friday
- `weekly` — repeats every Monday
- `monthly` — repeats on the 1st of each month

The existing `DailyTaskInstanceRepository` prevents duplicate instances by tracking `lastGeneratedDate`. Daily generation checks whether instances already exist for the current day before creating new ones.

Recurrence is stored on the `TaskDefinition`. Personal `UserTask` records do not currently auto-generate from a recurrence rule — the user creates them explicitly.

## Completion Strategy

### Personal completion (UserTask)
- Toggled via `completed` boolean on the task record
- History: `completedAt` timestamp, viewable per task

### Shared task completion (TaskDefinition + TaskInstance)
- Completion is **per-user**: each receptionist completes their own `TaskInstance`
- `TaskCompletion` records provide a separate audit trail
- `completionType: team` allows one authorised user to complete for the team

## Repository Architecture

```
IUserTaskRepository (interface)
  └── UserTaskRepository (localStorage, key: asg_reception_user_tasks)

ITaskCompletionRepository (interface)
  └── TaskCompletionRepository (localStorage, key: asg_reception_task_completions)
```

Firestore implementations are stubbed and ready for wiring when the Firebase provider is activated.

## Firestore Collections (planned)

- `userTasks` — personal task documents
- `taskTemplates` — shared task definitions
- `taskCompletions` — completion records

Add indexes for:
- `userTasks` by `ownerUid` + `completed` + `archived`
- `taskCompletions` by `taskDefinitionId`

## Firestore Security Rules

Rules for these collections must enforce:
- users may CRUD only their own `userTasks`
- users cannot spoof `ownerUid`
- administrators manage `taskTemplates`
- users may write only their own `taskCompletions`
- team-completion writes require appropriate office scope

## Dashboard Integration

The dashboard progress widget (`ProgressBar`) was fixed to display 0% instead of NaN when no tasks exist.

Current widgets using task data:
- Today's Progress — counts completed vs total shared tasks
- Priority Tasks — high-priority incomplete tasks
- Opening Routine — incomplete opening tasks
- Upcoming Tasks — all pending shared tasks

## Permissions

| Action | Admin | Reception |
|--------|-------|-----------|
| Create personal task | Yes | Yes |
| Edit own personal task | Yes | Yes |
| Complete own task | Yes | Yes |
| Archive own task | Yes | Yes |
| Delete own archived task | Yes | Yes |
| View shared templates | Yes | Yes |
| Create/modify shared templates | Yes | No |
| Create office-scoped tasks | Yes | No |

## Known Limitations

1. Personal task recurrence is not auto-generated (user creates each occurrence)
2. No Firebase Storage or Firestore implementations for new repositories
3. No team-completion UI yet (infrastructure exists in model)
4. Tests for new repositories need expansion
5. `TaskCompletion` records are created but not displayed in TasksPage yet
6. The existing `generateDailyTasks()` materialises all active definitions — personal tasks use a separate path

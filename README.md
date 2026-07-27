# ASG Brisbane Reception — Day-to-Day Hub

**Organised. Supported. Confident.**

A polished, production-quality Reception Training and Operations Hub for Amplify Solutions Group's Brisbane office. Built as a local MVP designed for future Firebase migration without rebuilding the interface or domain logic.

---

## Technology

- **React 19** + **TypeScript** (Vite 7)
- **React Router v7** — client-side routing with role-based guards
- **CSS Modules** + CSS custom properties — design system, no UI framework
- **lucide-react** — consistent fine-line icons
- **Vitest** + **Testing Library** — 26 passing tests

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Seeded Local Accounts

| Name | Role | PIN |
|------|------|-----|
| Administrator | Administrator (All) | `8711` |
| Brisbane Reception | Reception (Brisbane) | `1001` |
| Perth Reception | Reception (Perth) | `1001` |

**Security limitations:** PINs are obscured with a simple hash (not bcrypt). localStorage is not encrypted. This is acceptable for a local MVP but must not be used for production authentication without a proper server and hashing layer. See `docs/FIREBASE_MIGRATION.md`.

---

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run test` | Run all tests |
| `npm run preview` | Preview production build locally |

---

## Project Structure

```
src/
  app/              App shell, layout, router
  components/       Reusable UI (Button, Card, Modal, Input, …)
  design-system/    CSS variables, global styles
  features/
    auth/           Login, AuthGuard, logout
    dashboard/      Staff dashboard
    tasks/          Daily task system
    training/       Training library + detail pages
    stock/          Stock register
    printing/       Printing register
    contacts/       Contact directory
    quickLinks/     Grouped external links
    admin/          Admin CRUD (staff, tasks, training, operations)
  models/           Domain types
  repositories/
    interfaces/     Firebase-ready contracts
    localStorage/   Concrete localStorage implementations
    seed/           Default seed data
  services/         Auth, task generation
  hooks/            React hooks for repositories
  utils/            cn(), date helpers, hash, storage wrapper
docs/
  FIREBASE_MIGRATION.md
```

---

## Firebase Migration Direction

The repository layer uses TypeScript interfaces so Firebase/Firestore implementations can be swapped in without changing any React component or business logic. See `docs/FIREBASE_MIGRATION.md`.

---

## Build

```bash
npm run build
```

Output is in `dist/`.

> Deployment has not yet been performed.
>
> Firebase and Vercel are not configured.

---

## Features

- **Staff Dashboard** — Today's progress, priority tasks, opening routine, overdue tasks, training due, low-stock alerts, printing reminders, need-help contacts
- **Daily Task System** — Generate daily task instances, complete/in-progress/skipped with notes, instructions, links
- **Training Centre** — 15 seeded training modules, detail pages, acknowledgement tracking
- **Stock Register** — Quantities, low-stock indicators, order recording, search and filter
- **Printing Register** — Track resources, record print runs, check-due reminders
- **Quick Links** — Grouped external links (Daily Systems, Communication, Documents, Ordering, Staff Resources)
- **Contacts** — Categorised directory with management, accounts, technical, and escalation contacts
- **Admin Area** — Staff management (add/edit/reset PIN), task and training overview, reset demo data
- **Role-Based Access** — Admin and receptionist roles, protected routes
- **Responsive Design** — Optimised for 1366×768 and 1920×1080, usable on tablets and mobile
- **Persistent Data** — All data survives refresh via localStorage with namespaced keys
- **Seed Data** — Only seeds when storage is empty; never overwrites edited data

---

## Pin Hashing

PINs are stored using a simple hash function (`simpleHash` in `src/utils/hash.ts`). This is not cryptographically secure. The hash is suitable only for local MVP use. Production deployment must use bcrypt or Argon2 via Firebase Authentication.

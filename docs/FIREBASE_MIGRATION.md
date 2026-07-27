# Firebase Migration Guide

This document describes how to migrate the ASG Brisbane Reception Hub from localStorage persistence to Firebase (Firestore, Authentication, Storage).

---

## Principle

Repository interfaces are defined in `src/repositories/interfaces/`. Every localStorage repository implements one of these contracts. A Firebase repository can be written against the same interface and swapped in — no React component, hook, or business service needs to change.

---

## Step-by-Step

### 1. Install Firebase

```bash
npm install firebase
```

### 2. Configure Firebase

Create `src/firebase/config.ts`:

```ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### 3. Firebase Repositories

Create `src/repositories/firebase/` and implement each interface, for example:

```ts
// src/repositories/firebase/StaffRepository.ts
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Staff, StaffCreate } from '../../models';
import type { IStaffRepository } from '../interfaces/IStaffRepository';

export class FirebaseStaffRepository implements IStaffRepository {
  private coll = collection(db, 'staff');

  async getAll(): Promise<Staff[]> { … }
  async getById(id: string): Promise<Staff | undefined> { … }
  // etc.
}
```

### 4. Firebase Authentication (Replaces PIN Login)

Replace `src/services/authService.ts`:

- Use `signInWithEmailAndPassword` or `signInWithCustomToken` instead of PIN verification
- Use `onAuthStateChanged` for session management
- Store the session with the same `Session` interface so `AuthGuard` and `AppLayout` continue working

### 5. Firebase Storage (Replaces Document URLs)

Training items with `documentUrl` can link to Firebase Storage. Replace placeholder URLs with uploaded document paths.

### 6. Dependency Injection

Currently, repositories are instantiated directly (e.g., `new StaffRepository()`). For migration:

- Option A: Create a service locator or DI container in `src/services/container.ts`
- Option B: Pass repositories as React context via `useContext`

**Recommended approach:** Create a `RepositoryProvider` context:

```tsx
const RepositoryContext = createContext<Repositories>(null!);
export function RepositoryProvider({ children, repos }: { children: React.ReactNode; repos: Repositories }) {
  return <RepositoryContext.Provider value={repos}>{children}</RepositoryContext.Provider>;
}
```

Then hooks and services consume `useContext(RepositoryContext)`.

### 7. Remove localStorage Cleanup

After Firebase is fully operational and data has been migrated:

1. Delete `src/repositories/localStorage/`
2. Delete `src/utils/storage.ts`
3. Remove `src/repositories/seed/` (Firestore seeding is handled separately)
4. Update `src/repositories/interfaces/` if async return types are needed (most will become `Promise<T>`)

---

## What Stays the Same

- **All React components** — They consume hooks and repository interfaces, not localStorage directly
- **Domain models** (`src/models/`) — Firestore documents map directly to these types
- **Routing, roles, guards** — `AuthGuard` reads from the session model, which stays identical
- **Task generation** — `generateDailyTasks()` works the same; only the data access changes
- **CSS and design system** — Unaffected

---

## What Changes

| Area | Now | After |
|------|-----|-------|
| Persistence | localStorage | Firestore |
| Authentication | PIN + simple hash | Firebase Auth (email/password or SSO) |
| File storage | Seed URLs / placeholders | Firebase Storage |
| Session | localStorage | Firebase Auth `onAuthStateChanged` |
| Async | Sync | Async — hooks become `useQuery` / `useMutation` |

---

## Testing the Migration

Run the existing test suite after each repository swap:

```bash
npm run test
```

The localStorage mock in `src/test-setup.ts` can be replaced or extended to support Firestore mocking (e.g., using `firebase-mock` or `@firebase/testing`).

---

## Firestore Security Rules (Suggested)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /staff/{userId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
    match /taskDefinitions/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.token.role == 'admin';
    }
    // ... similar rules for other collections
  }
}
```

> **Note:** Firebase has not been installed or configured in this initial implementation.
> This document is a reference for the future migration step.

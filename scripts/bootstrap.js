#!/usr/bin/env node
/**
 * ASG Reception Hub — Bootstrap Operational Accounts
 *
 * One-time local setup script. Creates Firebase Auth users, userProfiles,
 * and operationalAccounts records for the three operational accounts.
 *
 * Usage:
 *   1. Create scripts/bootstrap.env with PINs (see bootstrap.env.example)
 *   2. Run: node scripts/bootstrap.js
 *   3. Delete scripts/bootstrap.env after completion
 *
 * Requirements:
 *   - Firebase project upgraded to Blaze plan
 *   - firebase-tools installed globally
 *   - Logged in via firebase login
 *   - Service account credentials or ADC configured
 *
 * This script never prints PIN values, PIN hashes, or custom tokens.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createRequire } from "module";

const admin = createRequire(import.meta.url)("firebase-admin");
const bcrypt = createRequire(import.meta.url)("bcrypt");

const ENV_FILE = resolve(import.meta.dirname, "bootstrap.env");

const ACCOUNTS = [
  { accountKey: "brisbane-reception", displayName: "Brisbane Reception", role: "reception", office: "brisbane", email: "brisbane.reception@receptionhub.internal", pinEnvVar: "PIN_BRISBANE" },
  { accountKey: "perth-reception", displayName: "Perth Reception", role: "reception", office: "perth", email: "perth.reception@receptionhub.internal", pinEnvVar: "PIN_PERTH" },
  { accountKey: "administrator", displayName: "Administrator", role: "administrator", office: "all", email: "administrator@receptionhub.internal", pinEnvVar: "PIN_ADMIN" },
];

function loadEnv() {
  if (!existsSync(ENV_FILE)) {
    console.error("Error: scripts/bootstrap.env not found.");
    console.error("Copy scripts/bootstrap.env.example to scripts/bootstrap.env and fill in the PINs.");
    process.exit(1);
  }
  const content = readFileSync(ENV_FILE, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

async function main() {
  console.log("ASG Reception Hub - Account Bootstrap");
  console.log("----------------------------------------");

  admin.initializeApp({ projectId: "receptionhub-f0e7a" });
  const auth = admin.auth();
  const db = admin.firestore();
  const env = loadEnv();
  const pepper = "asg-reception-hub-local-bootstrap-2026";

  for (const acct of ACCOUNTS) {
    const pin = env[acct.pinEnvVar];
    if (!pin || !/^\d{4}$/.test(pin)) {
      console.log("[SKIP] " + acct.displayName + ": PIN not configured");
      continue;
    }
    process.stdout.write("[INFO] Processing " + acct.displayName + "... ");

    const existing = await db.collection("operationalAccounts").where("accountKey", "==", acct.accountKey).limit(1).get();
    if (!existing.empty) {
      console.log("already exists (" + existing.docs[0].id + ")");
      continue;
    }

    let uid;
    try {
      const rec = await auth.createUser({ email: acct.email, emailVerified: false, disabled: false, displayName: acct.displayName });
      uid = rec.uid;
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        const u = await auth.getUserByEmail(acct.email);
        uid = u.uid;
      } else {
        console.log("ERROR: " + err.message);
        continue;
      }
    }

    await auth.setCustomUserClaims(uid, { accountKey: acct.accountKey, role: acct.role, office: acct.office });
    const pepperedHash = await bcrypt.hash(pin + pepper, 12);
    const now = admin.firestore.Timestamp.now();

    await db.collection("operationalAccounts").doc(uid).set({
      accountKey: acct.accountKey, uid, displayName: acct.displayName,
      role: acct.role, office: acct.office, active: true, pinHash: pepperedHash,
      failedAttemptCount: 0, lockedUntil: null, createdAt: now, updatedAt: now,
    });
    await db.collection("userProfiles").doc(uid).set({
      uid, accountKey: acct.accountKey, displayName: acct.displayName,
      role: acct.role, office: acct.office, active: true, createdAt: now, updatedAt: now,
    });

    console.log("OK (" + uid + ")");
  }

  console.log("----------------------------------------");
  console.log("Bootstrap complete. Delete scripts/bootstrap.env now.");
  process.exit(0);
}

main().catch(function(err) { console.error("Bootstrap failed:", err.message); process.exit(1); });

#!/usr/bin/env node
/**
 * ASG Reception Hub — Bootstrap Operational Accounts
 *
 * One-time local setup script. Prompts for the pepper and each PIN
 * using hidden terminal input. Never echoes, logs, or stores entered values.
 *
 * Usage:
 *   node scripts/bootstrap.js
 *
 * Requirements:
 *   - Firebase project upgraded to Blaze plan
 *   - service account key via GOOGLE_APPLICATION_CREDENTIALS or firebase login
 *   - Admin SDK accessible from project root
 */

import { createRequire } from "module";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const bcrypt = require("bcrypt");

const ACCOUNTS = [
  { accountKey: "brisbane-reception", displayName: "Brisbane Reception", role: "reception", office: "brisbane", email: "brisbane.reception@receptionhub.internal" },
  { accountKey: "perth-reception", displayName: "Perth Reception", role: "reception", office: "perth", email: "perth.reception@receptionhub.internal" },
  { accountKey: "administrator", displayName: "Administrator", role: "administrator", office: "all", email: "administrator@receptionhub.internal" },
];

async function hiddenQuestion(prompt) {
  const rl = readline.createInterface({ input, output });
  return new Promise((resolve) => {
    output.write(prompt);
    const stdin = process.stdin;
    const isRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    let input = "";
    const handler = (key) => {
      const byte = key[0];
      if (byte === 0x0d || byte === 0x0a) {
        stdin.setRawMode(isRaw);
        stdin.pause();
        stdin.removeListener("data", handler);
        output.write("\n");
        rl.close();
        resolve(input);
      } else if (byte === 0x7f || byte === 0x08) {
        input = input.slice(0, -1);
      } else if (byte >= 0x20 && byte <= 0x7e) {
        input += key;
      }
    };
    stdin.on("data", handler);
  });
}

async function main() {
  console.log("ASG Reception Hub - Account Bootstrap");
  console.log("Project: receptionhub-f0e7a");
  console.log("----------------------------------------");
  console.log("WARNING: This will create or update operational accounts.");
  console.log("Type CONFIRM to proceed:");
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("> ");
  rl.close();
  if (answer.trim() !== "CONFIRM") {
    console.log("Cancelled.");
    process.exit(0);
  }

  // Get pepper via hidden input (must match firebase functions:secrets:set value)
  const pepper = await hiddenQuestion("Enter OPERATIONAL_LOGIN_PEPPER (hidden input): ");

  admin.initializeApp({ projectId: "receptionhub-f0e7a" });
  const auth = admin.auth();
  const db = admin.firestore();

  for (const acct of ACCOUNTS) {
    const pin = await hiddenQuestion("PIN for " + acct.displayName + " (4 digits, hidden): ");

    if (!/^\d{4}$/.test(pin)) {
      console.log("[SKIP] " + acct.displayName + ": invalid PIN (must be exactly 4 digits)");
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

    // Clear PIN from memory
    pin.length = 0;

    console.log("OK (" + uid + ")");
  }

  // Clear pepper from memory
  pepper.length = 0;

  console.log("----------------------------------------");
  console.log("Bootstrap complete.");
  process.exit(0);
}

main().catch(function(err) { console.error("Bootstrap failed:", err.message); process.exit(1); });

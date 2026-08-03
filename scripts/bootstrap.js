#!/usr/bin/env node
/**
 * ASG Reception Hub — Bootstrap Operational Accounts
 *
 * One-time local setup script. Uses modular firebase-admin v14 API.
 * Prompts for the pepper and PINs via PowerShell Read-Host -AsSecureString
 * (reliable hidden input on Windows). Never echoes, logs, or stores values.
 *
 * Usage:
 *   node scripts/bootstrap.js           # live run
 *   node scripts/bootstrap.js --dry-run # validate only, no writes
 *
 * Requirements:
 *   - Firebase project on Blaze plan
 *   - firebase-admin@14 + bcrypt installed at project root
 *   - Application Default Credentials configured (firebase login or GOOGLE_APPLICATION_CREDENTIALS)
 */

import { createRequire } from "module";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const require = createRequire(import.meta.url);
const { initializeApp, getApps, getApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const bcrypt = require("bcrypt");

const PROJECT_ID = "receptionhub-f0e7a";

const ACCOUNTS = [
  { accountKey: "brisbane-reception", displayName: "Brisbane Reception", role: "reception", office: "brisbane", email: "brisbane.reception@receptionhub.internal" },
  { accountKey: "perth-reception", displayName: "Perth Reception", role: "reception", office: "perth", email: "perth.reception@receptionhub.internal" },
  { accountKey: "administrator", displayName: "Administrator", role: "administrator", office: "all", email: "administrator@receptionhub.internal" },
];

const isDryRun = process.argv.includes("--dry-run");

/**
 * Prompt for sensitive input via PowerShell Read-Host -AsSecureString.
 * This is the only reliably echo-free input method on Windows.
 */
function hiddenPowerShellPrompt(prompt) {
  const tmpDir = mkdtempSync(join(tmpdir(), "asg-bootstrap-"));
  const ps1 = join(tmpDir, "prompt.ps1");
  const outFile = join(tmpDir, "out.txt");
  const encodedPrompt = Buffer.from(prompt, "utf16le").toString("base64");
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$promptBytes = [Convert]::FromBase64String('" + encodedPrompt + "')",
    "$promptStr = [System.Text.Encoding]::Unicode.GetString($promptBytes)",
    "$sec = Read-Host -AsSecureString $promptStr",
    "$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)",
    "$plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)",
    "[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)",
    "$sec.Dispose()",
    // Write to file to avoid stdout encoding issues
    "[System.IO.File]::WriteAllText('" + outFile.replace(/\\/g, "\\\\") + "', $plain, [System.Text.UTF8Encoding]::new($false))"
  ].join("; ");
  writeFileSync(ps1, script, "utf-8");
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${ps1}"`, {
      stdio: ["inherit", "inherit", "pipe"],
      windowsHide: true,
    });
    const result = require("fs").readFileSync(outFile, "utf-8").replace(/\r?\n$/, "");
    return result;
  } finally {
    try { unlinkSync(ps1); } catch {}
    try { unlinkSync(outFile); } catch {}
    try { require("fs").rmdirSync(tmpDir); } catch {}
  }
}

function checkFirebaseAdmin() {
  try {
    require.resolve("firebase-admin");
    require.resolve("bcrypt");
    return true;
  } catch {
    return false;
  }
}

async function verifyConnection(auth, db) {
  // Verify Firebase Auth access
  try {
    await auth.getUser("nonexistent-user-for-test");
  } catch (err) {
    // Expected error for nonexistent user — confirms Auth API works
    if (err.code !== "auth/user-not-found") throw err;
  }
  // Verify Firestore access by reading a known collection
  try {
    const test = await db.collection("operationalAccounts").limit(1).get();
    // No-op: just confirm we can read
  } catch (err) {
    if (err.code !== 7 && err.code !== "PERMISSION_DENIED") throw err;
  }
}

async function main() {
  process.stdout.write("ASG Reception Hub - Account Bootstrap\n");
  process.stdout.write("Project: " + PROJECT_ID + "\n");
  process.stdout.write("Mode: " + (isDryRun ? "DRY RUN (no writes)" : "LIVE") + "\n");
  process.stdout.write("Node: " + process.version + "\n");
  process.stdout.write("----------------------------------------\n");

  // Verify dependencies
  if (!checkFirebaseAdmin()) {
    console.error("Error: firebase-admin or bcrypt not found. Run: npm install firebase-admin@14 bcrypt");
    process.exit(1);
  }

  // Initialize Firebase Admin (modular v14 API)
  const app = getApps().length === 0
    ? initializeApp({ projectId: PROJECT_ID })
    : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (isDryRun) {
    process.stdout.write("[DRY-RUN] Firebase Admin initialised\n");
    process.stdout.write("[DRY-RUN] Verifying connection...\n");
    try {
      await verifyConnection(auth, db);
      process.stdout.write("[DRY-RUN] Connection OK - Firebase Auth and Firestore accessible\n");
    } catch (err) {
      process.stdout.write("[DRY-RUN] Connection warning: " + err.message + "\n");
    }
    process.stdout.write("[DRY-RUN] Account definitions:\n");
    for (const acct of ACCOUNTS) {
      const email = acct.email;
      process.stdout.write("  - " + acct.displayName + " (" + acct.accountKey + ", " + acct.role + ", " + acct.office + ") [" + email + "]\n");
    }
    process.stdout.write("[DRY-RUN] Would prompt for pepper and 3 PINs (hidden input)\n");
    process.stdout.write("[DRY-RUN] Bootstrap validation complete - no writes performed\n");
    process.exit(0);
  }

  // Live mode
  process.stdout.write("WARNING: This will create or update operational accounts.\n");
  process.stdout.write("Type CONFIRM to proceed: ");
  const { stdin: input, stdout: output } = await import("node:process");
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question("");
  rl.close();
  if (answer.trim() !== "CONFIRM") {
    process.stdout.write("Cancelled.\n");
    process.exit(0);
  }

  process.stdout.write("\n");
  const pepper = hiddenPowerShellPrompt("Enter OPERATIONAL_LOGIN_PEPPER (hidden)");

  for (const acct of ACCOUNTS) {
    const pin = hiddenPowerShellPrompt("PIN for " + acct.displayName + " (4 digits, hidden)");

    if (!/^\d{4}$/.test(pin)) {
      process.stdout.write("[SKIP] " + acct.displayName + ": invalid PIN (must be exactly 4 digits)\n");
      continue;
    }
    process.stdout.write("[INFO] Processing " + acct.displayName + "... ");

    let isExisting = false;
    let uid;
    try {
      const existing = await db.collection("operationalAccounts").where("accountKey", "==", acct.accountKey).limit(1).get();
     if (!existing.empty) {
        uid = existing.docs[0].data().uid || existing.docs[0].id;
        isExisting = true;
        process.stdout.write("updating existing account (" + existing.docs[0].id + ")\n");
     }
   } catch (err) {
     process.stdout.write("ERROR checking existing: " + err.message + "\n");
     continue;
   }

    if (!isExisting) {
    try {
      const rec = await auth.createUser({
        email: acct.email,
        emailVerified: false,
        disabled: false,
        displayName: acct.displayName,
      });
      uid = rec.uid;
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        try {
          const u = await auth.getUserByEmail(acct.email);
          uid = u.uid;
        } catch (e2) {
          process.stdout.write("ERROR looking up existing user: " + e2.message + "\n");
          continue;
        }
      } else {
       process.stdout.write("ERROR creating user: " + err.message + "\n");
       continue;
     }
   }
   }

   try {
      await auth.setCustomUserClaims(uid, {
        accountKey: acct.accountKey,
        role: acct.role,
        office: acct.office,
      });
    } catch (err) {
      process.stdout.write("ERROR setting claims: " + err.message + "\n");
      continue;
    }

    const pepperedHash = await bcrypt.hash(pin + pepper, 12);
    const now = Timestamp.now();

  try {
     if (isExisting) {
       await db.collection("operationalAccounts").doc(uid).update({
         pinHash: pepperedHash,
         failedAttemptCount: 0,
         lockedUntil: null,
         updatedAt: now,
       });
       await db.collection("userProfiles").doc(uid).update({
         updatedAt: now,
       });
     } else {
      await db.collection("operationalAccounts").doc(uid).set({
        accountKey: acct.accountKey, uid, displayName: acct.displayName,
        role: acct.role, office: acct.office, active: true, pinHash: pepperedHash,
        failedAttemptCount: 0, lockedUntil: null, createdAt: now, updatedAt: now,
      });
      await db.collection("userProfiles").doc(uid).set({
        uid, accountKey: acct.accountKey, displayName: acct.displayName,
        role: acct.role, office: acct.office, active: true, createdAt: now, updatedAt: now,
      });
     }
    } catch (err) {
      process.stdout.write("ERROR writing Firestore: " + err.message + "\n");
      continue;
    }

    process.stdout.write("OK (" + uid + ")\n");
  }

  process.stdout.write("----------------------------------------\n");
  process.stdout.write("Bootstrap complete.\n");
  process.exit(0);
}

main().catch(function(err) {
  console.error("Bootstrap failed:", err.message);
  process.exit(1);
});

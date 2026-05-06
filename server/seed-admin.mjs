#!/usr/bin/env node
// Usage: node server/seed-admin.mjs <email> <password>
// Idempotent: if the email already exists, updates the password.

import { fileURLToPath } from "node:url";
import { openDb, dbPath } from "./db.mjs";
import { hashPassword, validatePassword } from "./auth.mjs";

export async function runSeed({
  argv,
  log = (m) => process.stdout.write(m + "\n"),
  error = (m) => process.stderr.write(String(m) + "\n"),
  // Injectable so tests can hand over a temp DB without spawning a process.
  openDbFn = openDb,
  dbPathFn = dbPath,
} = {}) {
  const [email, password] = argv;
  if (!email || !password) {
    error("Usage: seed-admin <email> <password>");
    return 1;
  }
  const policy = validatePassword(password);
  if (policy) {
    error(policy);
    return 2;
  }
  const db = openDbFn(dbPathFn());
  try {
    const hash = await hashPassword(password);
    const now = new Date().toISOString();
    const existing = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get(email.toLowerCase());
    if (existing) {
      db.prepare(
        "UPDATE admins SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
      ).run(hash, now, existing.id);
      log(`Updated admin ${email}`);
    } else {
      db.prepare(
        `INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      ).run(email.toLowerCase(), hash, now, now);
      log(`Created admin ${email}`);
    }
    return 0;
  } catch (err) {
    error(err);
    return 3;
  }
}

// Auto-run only when invoked directly as a script.
if (
  import.meta.url === `file://${process.argv[1]}` ||
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  runSeed({ argv: process.argv.slice(2) }).then((code) => process.exit(code));
}

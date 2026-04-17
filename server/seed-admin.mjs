#!/usr/bin/env node
// Usage: node server/seed-admin.mjs <email> <password>
// Idempotent: if the email already exists, updates the password.

import { openDb, dbPath } from "./db.mjs";
import { hashPassword, validatePassword } from "./auth.mjs";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: seed-admin <email> <password>");
    process.exit(1);
  }
  const policy = validatePassword(password);
  if (policy) {
    console.error(policy);
    process.exit(2);
  }
  const db = openDb(dbPath());
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    db.prepare(
      "UPDATE admins SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
    ).run(hash, now, existing.id);
    console.log(`Updated admin ${email}`);
  } else {
    db.prepare(
      `INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)`,
    ).run(email.toLowerCase(), hash, now, now);
    console.log(`Created admin ${email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});

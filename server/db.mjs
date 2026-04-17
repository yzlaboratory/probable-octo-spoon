import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function openDb(filePath) {
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  runMigrations(db);
  return db;
}

function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const schemaDir = path.join(__dirname, "schema");
  const files = fs.readdirSync(schemaDir).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set(
    db.prepare("SELECT name FROM schema_migrations").all().map((r) => r.name),
  );

  const apply = db.transaction((name, sql) => {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(
      name,
      new Date().toISOString(),
    );
  });

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(schemaDir, file), "utf8");
    apply(file, sql);
  }
}

export function dbPath() {
  return process.env.DB_PATH || "/var/lib/clubsoft/app.db";
}

export function mediaRoot() {
  return process.env.MEDIA_ROOT || "/var/lib/clubsoft/media";
}

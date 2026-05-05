import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import { openDb } from "../../server/db.mjs";
// @ts-expect-error — .mjs with no types
import { runMaintenanceTick } from "../../server/tick.mjs";

function tmpDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clubsoft-tick-test-"));
  const file = path.join(dir, "app.db");
  return { dir, db: openDb(file) };
}

describe("runMaintenanceTick", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it("runs publish + sweep on a real db without throwing", () => {
    const { dir, db } = tmpDb();
    try {
      const past = new Date(Date.now() - 60_000).toISOString();
      const now = new Date().toISOString();

      // Scheduled article whose publish_at is in the past — the publish tick
      // should flip its status to 'published'.
      db.prepare(
        `INSERT INTO news (id, slug, title, tag, short, long_html, status, publish_at, created_at, updated_at)
         VALUES (1, 'hello', 'Hello', 'news', 's', '<p/>', 'scheduled', ?, ?, ?)`,
      ).run(past, now, now);

      // Admin referenced by the session row, plus an expired session — the
      // sweep should remove it.
      db.prepare(
        `INSERT INTO admins (id, email, password_hash, created_at, updated_at)
         VALUES (1, 'a@example.com', 'x', ?, ?)`,
      ).run(now, now);
      db.prepare(
        `INSERT INTO sessions (id, admin_id, csrf_token, created_at, last_seen, expires_at)
         VALUES ('expired-session', 1, 'csrf', ?, ?, ?)`,
      ).run(now, now, past);

      expect(() => runMaintenanceTick(db)).not.toThrow();

      const news = db.prepare("SELECT status FROM news WHERE id = 1").get();
      expect(news.status).toBe("published");
      const sessionCount = db
        .prepare("SELECT COUNT(*) as c FROM sessions WHERE id = 'expired-session'")
        .get();
      expect(sessionCount.c).toBe(0);
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("logs and continues to the sweep when the publish tick throws", () => {
    const sweepRun = vi.fn();
    const fakeDb = {
      prepare(sql: string) {
        if (sql.startsWith("UPDATE news")) {
          throw new Error("publish boom");
        }
        if (sql.startsWith("DELETE FROM sessions")) {
          return { run: sweepRun };
        }
        throw new Error(`unexpected sql: ${sql}`);
      },
    };

    runMaintenanceTick(fakeDb);

    expect(errSpy).toHaveBeenCalledWith("publish tick:", expect.any(Error));
    expect(sweepRun).toHaveBeenCalledTimes(1);
  });

  it("logs and swallows when the session sweep throws", () => {
    const publishRun = vi.fn();
    const fakeDb = {
      prepare(sql: string) {
        if (sql.startsWith("UPDATE news")) {
          return { run: publishRun };
        }
        if (sql.startsWith("DELETE FROM sessions")) {
          throw new Error("sweep boom");
        }
        throw new Error(`unexpected sql: ${sql}`);
      },
    };

    expect(() => runMaintenanceTick(fakeDb)).not.toThrow();

    expect(publishRun).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalledWith("session sweep:", expect.any(Error));
  });
});

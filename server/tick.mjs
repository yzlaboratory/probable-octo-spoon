import { runPublishTick } from "./routes/news.mjs";
import { sweepExpiredSessions } from "./auth.mjs";

export function runMaintenanceTick(db) {
  try {
    runPublishTick(db);
  } catch (e) {
    console.error("publish tick:", e);
  }
  try {
    sweepExpiredSessions(db);
  } catch (e) {
    console.error("session sweep:", e);
  }
}

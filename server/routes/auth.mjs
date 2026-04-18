import express from "express";
import { z } from "zod";
import {
  attemptLogin,
  consumePasswordResetToken,
  createPasswordResetToken,
  destroySession,
  hashPassword,
  markResetUsed,
  validatePassword,
} from "../auth.mjs";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  csrfCookieOptions,
  errorEnvelope,
  loginRateLimiter,
  requireAuth,
  requireCsrf,
} from "../middleware.mjs";

const ABS_MS = 24 * 60 * 60 * 1000;

export default function authRoutes(db) {
  const router = express.Router();

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  router.post("/login", loginRateLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return errorEnvelope(res, 400, "bad_request", "Ungültige Anmeldedaten.");
    const { email, password } = parsed.data;
    const result = await attemptLogin(db, email.toLowerCase(), password);
    if (!result.ok) {
      if (result.reason === "locked") {
        return errorEnvelope(
          res,
          423,
          "locked",
          "Konto vorübergehend gesperrt. Bitte in 15 Minuten erneut versuchen.",
        );
      }
      return errorEnvelope(res, 401, "invalid_credentials", "E-Mail oder Passwort stimmt nicht.");
    }
    res.cookie(SESSION_COOKIE, result.session.id, cookieOptions(ABS_MS));
    res.cookie(CSRF_COOKIE, result.session.csrf, csrfCookieOptions(ABS_MS));
    res.json({
      admin: { id: result.admin.id, email: result.admin.email },
      csrfToken: result.session.csrf,
      mustChangePassword: !!result.admin.must_change_password,
    });
  });

  router.post("/logout", requireAuth, requireCsrf, (req, res) => {
    destroySession(db, req.session.id);
    res.clearCookie(SESSION_COOKIE, cookieOptions(0));
    res.clearCookie(CSRF_COOKIE, csrfCookieOptions(0));
    res.json({ ok: true });
  });

  router.get("/me", (req, res) => {
    if (!req.session) return res.status(401).json({ code: "unauthenticated" });
    res.json({
      admin: { id: req.admin.id, email: req.admin.email },
      csrfToken: req.session.csrf_token,
    });
  });

  // An authenticated admin issues a one-time reset link for another admin.
  const issueResetSchema = z.object({ email: z.string().email() });
  router.post("/reset-link", requireAuth, requireCsrf, (req, res) => {
    const parsed = issueResetSchema.safeParse(req.body);
    if (!parsed.success) return errorEnvelope(res, 400, "bad_request", "Ungültige E-Mail.");
    const target = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get(parsed.data.email.toLowerCase());
    if (!target) return errorEnvelope(res, 404, "not_found", "Kein Administrator mit dieser E-Mail.");
    const token = createPasswordResetToken(db, target.id);
    res.json({ token });
  });

  const consumeSchema = z.object({
    token: z.string().min(32),
    newPassword: z.string().min(12),
  });
  router.post("/reset-consume", async (req, res) => {
    const parsed = consumeSchema.safeParse(req.body);
    if (!parsed.success) return errorEnvelope(res, 400, "bad_request", "Ungültige Eingabe.");
    const result = consumePasswordResetToken(db, parsed.data.token, parsed.data.newPassword);
    if (!result.ok) {
      if (result.reason === "policy")
        return errorEnvelope(res, 422, "password_policy", result.message);
      return errorEnvelope(res, 400, "invalid_token", "Reset-Link ungültig oder abgelaufen.");
    }
    const hash = await hashPassword(parsed.data.newPassword);
    db.prepare(
      "UPDATE admins SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?",
    ).run(hash, new Date().toISOString(), result.adminId);
    markResetUsed(db, parsed.data.token);
    // Log out all existing sessions for that admin — they must re-auth.
    db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(result.adminId);
    res.json({ ok: true });
  });

  const createAdminSchema = z.object({
    email: z.string().email(),
    password: z.string().min(12),
    mustChangePassword: z.boolean().optional().default(false),
  });
  router.post("/admins", requireAuth, requireCsrf, async (req, res) => {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) return errorEnvelope(res, 400, "bad_request", "Ungültige Eingabe.");
    const policy = validatePassword(parsed.data.password);
    if (policy) return errorEnvelope(res, 422, "password_policy", policy);
    const exists = db
      .prepare("SELECT 1 FROM admins WHERE email = ?")
      .get(parsed.data.email.toLowerCase());
    if (exists) return errorEnvelope(res, 409, "already_exists", "E-Mail bereits vergeben.");
    const hash = await hashPassword(parsed.data.password);
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO admins (email, password_hash, must_change_password, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(parsed.data.email.toLowerCase(), hash, parsed.data.mustChangePassword ? 1 : 0, now, now);
    res.status(201).json({ id: info.lastInsertRowid, email: parsed.data.email.toLowerCase() });
  });

  router.get("/admins", requireAuth, (_req, res) => {
    const rows = db
      .prepare("SELECT id, email, must_change_password, created_at FROM admins ORDER BY email")
      .all();
    res.json(rows);
  });

  return router;
}

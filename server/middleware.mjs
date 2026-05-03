import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { loadSession } from "./auth.mjs";

export const SESSION_COOKIE = "clubsoft_sid";
export const CSRF_COOKIE = "clubsoft_csrf";

export function cookieOptions(maxAgeMs) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function csrfCookieOptions(maxAgeMs) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: false,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        // Same-origin embedding is required by /admin/public, which iframes
        // the live public site for editor preview. Cross-origin clickjacking
        // is still blocked because every other origin remains forbidden.
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        fontSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { code: "rate_limited", message: "Zu viele Anmeldeversuche. Bitte später erneut versuchen." },
});

export function sessionMiddleware(db) {
  return (req, _res, next) => {
    const sid = req.cookies?.[SESSION_COOKIE];
    const session = loadSession(db, sid);
    req.session = session;
    if (session) {
      req.admin = db.prepare("SELECT id, email FROM admins WHERE id = ?").get(session.admin_id);
    }
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ code: "unauthenticated", message: "Anmeldung erforderlich." });
  }
  next();
}

function timingSafeEq(a, b) {
  const ab = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function requireCsrf(req, res, next) {
  const header = req.get("x-csrf-token");
  const cookie = req.cookies?.[CSRF_COOKIE];
  const session = req.session?.csrf_token;
  if (!header || !cookie || !session || !timingSafeEq(header, cookie) || !timingSafeEq(cookie, session)) {
    return res.status(403).json({ code: "csrf", message: "Ungültiger CSRF-Token." });
  }
  next();
}

export function errorEnvelope(res, status, code, message, fields) {
  return res.status(status).json({ code, message, fields });
}

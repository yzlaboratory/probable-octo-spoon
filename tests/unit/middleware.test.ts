import { describe, it, expect, afterEach } from "vitest";
// @ts-expect-error — .mjs has no types
import {
  cookieOptions,
  csrfCookieOptions,
  helmetMiddleware,
  errorEnvelope,
} from "../../server/middleware.mjs";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

describe("cookieOptions", () => {
  it("is httpOnly and sameSite=strict in development", () => {
    process.env.NODE_ENV = "development";
    const opts = cookieOptions(60_000);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("strict");
    expect(opts.secure).toBe(false);
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(60_000);
  });

  it("flips secure=true when NODE_ENV=production", () => {
    process.env.NODE_ENV = "production";
    expect(cookieOptions(1).secure).toBe(true);
  });
});

describe("csrfCookieOptions", () => {
  it("is httpOnly=false (so the SPA can read it) and sameSite=strict", () => {
    process.env.NODE_ENV = "development";
    const opts = csrfCookieOptions(60_000);
    expect(opts.httpOnly).toBe(false);
    expect(opts.sameSite).toBe("strict");
    expect(opts.secure).toBe(false);
    expect(opts.maxAge).toBe(60_000);
  });

  it("flips secure=true when NODE_ENV=production", () => {
    process.env.NODE_ENV = "production";
    expect(csrfCookieOptions(1).secure).toBe(true);
  });
});

describe("helmetMiddleware", () => {
  it("returns an express-style middleware (req, res, next)", () => {
    const mw = helmetMiddleware();
    expect(typeof mw).toBe("function");
    // Helmet middlewares accept exactly (req, res, next) — three args.
    expect(mw.length).toBe(3);
  });
});

describe("errorEnvelope", () => {
  it("writes the {code, message, fields} envelope with the given status", () => {
    let setStatus = 0;
    let body: unknown = null;
    const res = {
      status(s: number) {
        setStatus = s;
        return this;
      },
      json(j: unknown) {
        body = j;
        return this;
      },
    };
    errorEnvelope(res, 422, "policy", "Nope.", { email: ["zu kurz"] });
    expect(setStatus).toBe(422);
    expect(body).toEqual({
      code: "policy",
      message: "Nope.",
      fields: { email: ["zu kurz"] },
    });
  });

  it("leaves fields undefined when no field map is supplied", () => {
    let body: any = null;
    const res = {
      status() {
        return this;
      },
      json(j: unknown) {
        body = j;
        return this;
      },
    };
    errorEnvelope(res, 400, "bad_request", "Ungültig.");
    expect(body.fields).toBeUndefined();
  });
});

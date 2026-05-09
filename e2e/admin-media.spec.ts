// Media upload + delete e2e — happy path (real PNG → Sharp variants) plus
// every guard the route enforces: kind whitelist, size cap (per-kind),
// MIME whitelist, in-use referential-integrity check, 404. Driven through
// page.request.post() with a multipart payload so we exercise multer +
// sharp + the SQLite media row + the on-disk variant generation.

import { test, expect } from "./support/fixtures";
import {
  csrfHeaders,
  getAdminCreds,
  loginAndGetCsrf,
} from "./support/admin";

const creds = getAdminCreds();

// Standard 1×1 transparent PNG — small enough that uploading it on every
// test run is negligible, and Sharp can resize it without error.
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const TINY_PNG = Buffer.from(TINY_PNG_B64, "base64");

test.describe("Admin media upload + delete", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  let csrf = "";

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    csrf = await loginAndGetCsrf(page, context, creds!);
  });

  test("uploads a PNG to the news kind, then deletes it", async ({ page }) => {
    const uploaded = await page.request.post("/api/media", {
      headers: csrfHeaders(csrf),
      multipart: {
        kind: "news",
        file: {
          name: "tiny.png",
          mimeType: "image/png",
          buffer: TINY_PNG,
        },
      },
    });
    expect(uploaded.status()).toBe(201);
    const media = (await uploaded.json()) as {
      id: number;
      kind: string;
      mimeType: string;
      variants: Record<string, string>;
    };
    expect(media.kind).toBe("news");
    expect(media.mimeType).toBe("image/png");
    // News kind generates 400w / 800w / 1600w webp + a JPEG fallback per ADR 0010.
    expect(media.variants["400w"]).toBeTruthy();
    expect(media.variants.fallbackJpg).toBeTruthy();

    // GET /api/media/:id round-trips the same row.
    const got = await page.request.get(`/api/media/${media.id}`);
    expect(got.status()).toBe(200);

    // Unreferenced — DELETE returns 204.
    const removed = await page.request.delete(`/api/media/${media.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(removed.status()).toBe(204);

    const gone = await page.request.get(`/api/media/${media.id}`);
    expect(gone.status()).toBe(404);
  });

  test("rejects unknown media kind on upload", async ({ page }) => {
    const res = await page.request.post("/api/media", {
      headers: csrfHeaders(csrf),
      multipart: {
        kind: "logo", // not in KINDS
        file: { name: "x.png", mimeType: "image/png", buffer: TINY_PNG },
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("bad_request");
  });

  test("rejects unsupported MIME for the kind (text → 415)", async ({
    page,
  }) => {
    const res = await page.request.post("/api/media", {
      headers: csrfHeaders(csrf),
      multipart: {
        kind: "news",
        file: {
          name: "notes.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("hello"),
        },
      },
    });
    expect(res.status()).toBe(415);
    expect((await res.json()).code).toBe("unsupported_type");
  });

  test("rejects oversized files for the sponsor kind (3MB > 2MB cap → 413)", async ({
    page,
  }) => {
    // Allocate a 3MB buffer. Multer's global limit is 10MB so this still
    // reaches the route handler, where MAX_SIZE.sponsor = 2MB fires first.
    const oversized = Buffer.alloc(3 * 1024 * 1024, 0);
    const res = await page.request.post("/api/media", {
      headers: csrfHeaders(csrf),
      multipart: {
        kind: "sponsor",
        file: {
          name: "huge.png",
          mimeType: "image/png",
          buffer: oversized,
        },
      },
    });
    expect(res.status()).toBe(413);
    expect((await res.json()).code).toBe("too_large");
  });

  test("rejects upload with no file attached", async ({ page }) => {
    const res = await page.request.post("/api/media", {
      headers: csrfHeaders(csrf),
      multipart: { kind: "news" },
    });
    expect(res.status()).toBe(400);
  });

  test("DELETE on a referenced media id returns 409 with referrer list", async ({
    page,
  }) => {
    // The seed populates sponsors with logo media — pick the first one and
    // try to delete the logo it depends on. Route should refuse.
    const sponsors = (await (
      await page.request.get("/api/sponsors")
    ).json()) as Array<{ id: number; name: string; logo: { id: number } | null }>;
    const withLogo = sponsors.find((s) => s.logo);
    expect(withLogo).toBeTruthy();

    const res = await page.request.delete(`/api/media/${withLogo!.logo!.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("in_use");
    expect(Array.isArray(body.references)).toBe(true);
    expect(body.references.length).toBeGreaterThan(0);
    // Reference structure: { kind, id, label }.
    expect(body.references[0]).toEqual(
      expect.objectContaining({ kind: expect.any(String), id: expect.any(Number) }),
    );
  });

  test("DELETE on unknown media id returns 404", async ({ page }) => {
    const res = await page.request.delete("/api/media/99999999", {
      headers: csrfHeaders(csrf),
    });
    expect(res.status()).toBe(404);
  });

  test("GET /api/media?kind=foo with bad kind returns 400", async ({ page }) => {
    const res = await page.request.get("/api/media?kind=logo");
    expect(res.status()).toBe(400);
  });

  test("renders the media library admin page", async ({ page }) => {
    await page.goto("/admin/media");
    await expect(page).toHaveURL(/\/admin\/media$/);
    await expect(page.getByTestId("media-toolbar")).toBeVisible();
  });
});

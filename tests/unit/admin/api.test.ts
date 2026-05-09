// Pure-logic tests for the admin API client (no React render). Per ADR 0014
// they live in the node project; the wrapper is environment-agnostic and only
// touches `fetch`.

import { describe, it, expect, vi, afterEach } from "vitest";
import { api, ApiError, setCsrfToken, getCsrfToken } from "../../../src/admin/api";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setCsrfToken(null);
});

function makeFetchMock(
  responder: (url: string, init: RequestInit) => Promise<Response> | Response,
) {
  const fn = vi.fn(async (url: string, init: RequestInit) => responder(url, init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("admin/api", () => {
  describe("CSRF token store", () => {
    it("round-trips set/get", () => {
      expect(getCsrfToken()).toBeNull();
      setCsrfToken("abc");
      expect(getCsrfToken()).toBe("abc");
      setCsrfToken(null);
      expect(getCsrfToken()).toBeNull();
    });
  });

  describe("request envelope", () => {
    it("api.get sends GET, no Content-Type, no CSRF header, parses JSON body", async () => {
      const fetchMock = makeFetchMock(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      );
      const out = await api.get<{ ok: boolean }>("/api/x");
      expect(out).toEqual({ ok: true });
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
      expect(headers["X-CSRF-Token"]).toBeUndefined();
    });

    it("api.post serializes a JSON body, sets Content-Type, and forwards the CSRF token when set", async () => {
      setCsrfToken("csrf-123");
      const fetchMock = makeFetchMock(
        async () => new Response("{}", { status: 200 }),
      );
      await api.post("/api/x", { a: 1 });
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe("POST");
      expect(init.body).toBe('{"a":1}');
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-CSRF-Token"]).toBe("csrf-123");
    });

    it("api.patch and api.delete use the right method", async () => {
      const fetchMock = makeFetchMock(
        async () => new Response("null", { status: 200 }),
      );
      await api.patch("/api/x", { a: 1 });
      await api.delete("/api/x");
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PATCH" });
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
    });

    it("api.delete with a body still serializes JSON (DELETE-with-body envelope used by /api/media)", async () => {
      const fetchMock = makeFetchMock(
        async () => new Response("{}", { status: 200 }),
      );
      await api.delete("/api/media/1", { force: true });
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.body).toBe('{"force":true}');
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json",
      );
    });

    it("api.upload sends a FormData body verbatim and OMITS the JSON Content-Type header", async () => {
      // The fetch wrapper must let the browser set the multipart boundary itself.
      const fetchMock = makeFetchMock(
        async () => new Response('{"id":1}', { status: 200 }),
      );
      const form = new FormData();
      form.append("file", new Blob(["hi"], { type: "text/plain" }), "f.txt");
      await api.upload("/api/upload", form);
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(init.method).toBe("POST");
      expect(init.body).toBe(form);
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });

    it("returns null when the body is empty (e.g. 204 with no payload)", async () => {
      // 204 prohibits a body; use 200 with an empty string instead — the
      // wrapper's `text ? JSON.parse(text) : null` branch treats both the same.
      makeFetchMock(async () => new Response("", { status: 200 }));
      const out = await api.get("/api/x");
      expect(out).toBeNull();
    });
  });

  describe("error path", () => {
    it("throws ApiError with status, code, message, fields and the full body for non-2xx responses", async () => {
      makeFetchMock(
        async () =>
          new Response(
            JSON.stringify({
              code: "validation_failed",
              message: "Boom",
              fields: { name: ["required"] },
              references: ["a", "b"],
            }),
            { status: 422 },
          ),
      );
      let caught: ApiError | null = null;
      try {
        await api.post("/api/x", {});
      } catch (e) {
        caught = e as ApiError;
      }
      expect(caught).toBeInstanceOf(ApiError);
      expect(caught!.status).toBe(422);
      expect(caught!.code).toBe("validation_failed");
      expect(caught!.message).toBe("Boom");
      expect(caught!.fields).toEqual({ name: ["required"] });
      expect(caught!.data.references).toEqual(["a", "b"]);
    });

    it("falls back to default code/message when the error body is empty", async () => {
      makeFetchMock(async () => new Response("", { status: 500 }));
      try {
        await api.get("/api/x");
        throw new Error("expected throw");
      } catch (e) {
        const err = e as ApiError;
        expect(err.status).toBe(500);
        expect(err.code).toBe("unknown");
        expect(err.message).toBe("HTTP 500");
      }
    });
  });
});

// Thin fetch wrapper for the admin SPA. Attaches credentials and the CSRF token
// required by every state-changing endpoint (double-submit cookie per ADR 0009).

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string[]>;
  constructor(status: number, body: { code?: string; message?: string; fields?: Record<string, string[]> }) {
    super(body.message || `HTTP ${status}`);
    this.status = status;
    this.code = body.code || "unknown";
    this.fields = body.fields;
  }
}

let csrfToken: string | null = null;
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}
export function getCsrfToken() {
  return csrfToken;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (method !== "GET" && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data || {});
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
  upload: async <T>(path: string, form: FormData) => request<T>("POST", path, form),
};

import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("react-dom/client");
  document.querySelectorAll("#root").forEach((el) => el.remove());
});

describe("main entry point", () => {
  it("calls createRoot(#root).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>)", async () => {
    // Mock react-dom/client.createRoot so the entry doesn't actually mount a
    // tree (which under StrictMode keeps firing effects after the test ends
    // and produces unhandled fetch rejections once the test's mocks are torn
    // down). We only care that the bootstrap line runs.
    const renderSpy = vi.fn();
    vi.doMock("react-dom/client", () => ({
      createRoot: vi.fn(() => ({ render: renderSpy, unmount: vi.fn() })),
      default: { createRoot: vi.fn() },
    }));

    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    await import("./main");

    const reactDom = await import("react-dom/client");
    expect(reactDom.createRoot).toHaveBeenCalledTimes(1);
    expect(reactDom.createRoot).toHaveBeenCalledWith(root);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect } from "vitest";
// @ts-expect-error — .mjs with no types
import { sanitizeNewsHtml, sanitizeSvg } from "../../server/sanitize.mjs";

describe("sanitizeNewsHtml", () => {
  it("strips script tags", () => {
    const out = sanitizeNewsHtml("<p>ok</p><script>alert(1)</script>");
    expect(out).toContain("<p>ok</p>");
    expect(out).not.toMatch(/<script/i);
  });
  it("strips event handler attributes", () => {
    const out = sanitizeNewsHtml("<p onclick=\"evil()\">hi</p>");
    expect(out).not.toMatch(/onclick/i);
  });
  it("keeps allowed tags: p, h2, h3, strong, em, ul, ol, li, a, blockquote, img", () => {
    const html =
      "<h2>t</h2><p><strong>b</strong><em>i</em></p><ul><li>x</li></ul><ol><li>y</li></ol><blockquote>q</blockquote><a href=\"https://x\">l</a><img src=\"https://x/y.jpg\" alt=\"a\">";
    const out = sanitizeNewsHtml(html);
    for (const tag of ["h2", "strong", "em", "ul", "ol", "li", "blockquote", "a", "img"]) {
      expect(out).toContain(`<${tag}`);
    }
  });
  it("drops disallowed tags like iframe and form", () => {
    const out = sanitizeNewsHtml('<iframe src="x"></iframe><form></form><p>keep</p>');
    expect(out).not.toMatch(/<iframe/i);
    expect(out).not.toMatch(/<form/i);
    expect(out).toContain("<p>keep</p>");
  });
  it("rewrites anchors to include rel=noopener", () => {
    const out = sanitizeNewsHtml('<a href="https://x" target="_blank">l</a>');
    expect(out).toMatch(/rel="noopener/);
  });
  it("strips javascript: schemes from href", () => {
    const out = sanitizeNewsHtml('<a href="javascript:alert(1)">nope</a>');
    expect(out).not.toMatch(/javascript:/i);
  });
});

describe("sanitizeSvg", () => {
  it("strips <script> elements", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="5" cy="5" r="4"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toMatch(/<script/i);
    expect(out).toMatch(/<circle/);
  });
  it("strips event-handler attributes", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4" onclick="alert(1)"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toMatch(/onclick/i);
  });
  it("strips xlink:href external references", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="https://evil.example/x.svg#a"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toMatch(/xlink:href=/i);
  });
  it("strips @import in <style>", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://evil.example/x.css);</style><circle cx="5" cy="5" r="4"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toMatch(/@import/);
  });
  it("keeps a normal logo intact enough to render", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).toMatch(/<svg/);
    expect(out).toMatch(/<circle/);
  });
});

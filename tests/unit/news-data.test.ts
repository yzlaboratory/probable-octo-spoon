import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const newsPath = resolve(__dirname, "../../src/data/news.json");
const newsData: Array<{
  id: number;
  path: string;
  title: string;
  tag: string;
  short: string;
  long: string;
  date: string;
  imageurl: string;
}> = JSON.parse(readFileSync(newsPath, "utf-8"));

describe("news.json", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(newsData)).toBe(true);
    expect(newsData.length).toBeGreaterThan(0);
  });

  it("each entry has all required fields", () => {
    const requiredFields = [
      "id",
      "path",
      "title",
      "tag",
      "short",
      "long",
      "date",
      "imageurl",
    ] as const;

    for (const entry of newsData) {
      for (const field of requiredFields) {
        expect(entry).toHaveProperty(field);
      }
    }
  });

  it("ids are unique", () => {
    const ids = newsData.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("paths are unique", () => {
    const paths = newsData.map((n) => n.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("dates are valid ISO date strings", () => {
    for (const entry of newsData) {
      const parsed = new Date(entry.date);
      expect(parsed.toString()).not.toBe("Invalid Date");
    }
  });

  it("imageurl points to src/assets", () => {
    for (const entry of newsData) {
      expect(entry.imageurl).toMatch(/^\/src\/assets\//);
    }
  });

  it("title and short are non-empty strings", () => {
    for (const entry of newsData) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.short.length).toBeGreaterThan(0);
    }
  });

  it("long text is at least as long as short text", () => {
    for (const entry of newsData) {
      expect(entry.long.length).toBeGreaterThanOrEqual(entry.short.length);
    }
  });

  it("tag is a non-empty uppercase string", () => {
    for (const entry of newsData) {
      expect(entry.tag.length).toBeGreaterThan(0);
      expect(entry.tag).toBe(entry.tag.toUpperCase());
    }
  });
});

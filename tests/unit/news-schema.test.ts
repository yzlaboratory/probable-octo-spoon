import { describe, it, expect } from "vitest";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Mirror the schema from content.config.ts
const newsSchema = z.object({
  id: z.number(),
  path: z.string(),
  title: z.string(),
  tag: z.string(),
  short: z.string(),
  long: z.string(),
  date: z.coerce.date(),
  imageurl: z.string(),
});

const newsPath = resolve(__dirname, "../../src/data/news.json");
const rawData = JSON.parse(readFileSync(newsPath, "utf-8"));

describe("news schema validation", () => {
  it("every news entry passes the Zod schema", () => {
    for (const entry of rawData) {
      const result = newsSchema.safeParse(entry);
      expect(result.success).toBe(true);
    }
  });

  it("rejects entry missing required field", () => {
    const invalid = { id: 99, path: "test", title: "Test" };
    const result = newsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects entry with invalid date", () => {
    const invalid = {
      id: 99,
      path: "test",
      title: "Test",
      tag: "TEST",
      short: "short",
      long: "long",
      date: "not-a-date",
      imageurl: "/src/assets/test.jpg",
    };
    const result = newsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("coerces valid date strings to Date objects", () => {
    const entry = rawData[0];
    const result = newsSchema.parse(entry);
    expect(result.date).toBeInstanceOf(Date);
  });
});

import { describe, expect, it } from "vitest";
import { screenshotSrc } from "@/lib/screenshot-source";

describe("screenshotSrc", () => {
  it("passes through existing data URIs", () => {
    expect(screenshotSrc("data:image/png;base64,abc123")).toBe(
      "data:image/png;base64,abc123",
    );
  });

  it("passes through remote screenshot URLs", () => {
    expect(screenshotSrc("https://example.com/screenshot.png")).toBe(
      "https://example.com/screenshot.png",
    );
  });

  it("wraps raw svg base64 with the correct mime type", () => {
    expect(screenshotSrc("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmci")).toBe(
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmci",
    );
  });
});

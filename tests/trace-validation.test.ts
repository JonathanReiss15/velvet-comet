import { describe, expect, it } from "vitest";
import { defaultFirecrawl } from "@/components/workbench/defaults";
import { validateTraceSetup } from "@/components/workbench/trace-validation";
import type { FirecrawlFormState } from "@/components/workbench/types";

describe("trace setup validation", () => {
  it("keeps the empty startup form from running", () => {
    const validation = validateTraceSetup({
      selectedExampleId: null,
      url: "",
      actionsJson: "",
      checksJson: "",
      firecrawl: freshFirecrawl(),
    });

    expect(validation.isReady).toBe(false);
    expect(validation.payload).toBeNull();
    expect(validation.fields.url).toBe("Enter a page URL.");
    expect(validation.fields.actions).toBe("Actions JSON is required.");
  });

  it("builds a payload from valid manual input", () => {
    const validation = validateTraceSetup({
      selectedExampleId: null,
      url: "https://example.com/",
      actionsJson: JSON.stringify([{ type: "wait", milliseconds: 500 }]),
      checksJson: "",
      firecrawl: freshFirecrawl(),
    });

    expect(validation.isReady).toBe(true);
    expect(validation.payload).toMatchObject({
      mode: "live",
      url: "https://example.com/",
      actions: [{ type: "wait", milliseconds: 500 }],
      checks: [],
    });
  });

  it("rejects unsupported action shapes before running", () => {
    const validation = validateTraceSetup({
      selectedExampleId: null,
      url: "https://example.com/",
      actionsJson: JSON.stringify([{ type: "click" }]),
      checksJson: "[]",
      firecrawl: freshFirecrawl(),
    });

    expect(validation.isReady).toBe(false);
    expect(validation.fields.actions).toContain("unsupported action shape");
  });

  it("validates Firecrawl option basics", () => {
    const firecrawl = freshFirecrawl();
    firecrawl.location.country = "USA";

    const validation = validateTraceSetup({
      selectedExampleId: null,
      url: "https://example.com/",
      actionsJson: JSON.stringify([{ type: "wait", milliseconds: 500 }]),
      checksJson: "[]",
      firecrawl,
    });

    expect(validation.isReady).toBe(false);
    expect(validation.fields.firecrawl).toBe(
      "Country must be a two-letter code.",
    );
  });
});

function freshFirecrawl(): FirecrawlFormState {
  return {
    ...defaultFirecrawl,
    location: { ...defaultFirecrawl.location },
    profile: { ...defaultFirecrawl.profile },
  };
}

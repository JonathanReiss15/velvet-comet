import { describe, expect, it } from "vitest";
import { redactTraceReport, traceToSupportSummary } from "@/lib/report-export";
import { defaultFirecrawlOptions } from "@/lib/examples";
import type { TraceReport } from "@/lib/trace-schema";

describe("report export", () => {
  it("removes screenshots, raw payloads, URLs, emails, and likely secrets", () => {
    const report: TraceReport = {
      ...sampleTraceReport(),
      url: "https://portal.example.com/export?token=super-secret",
      liveViewUrl: "https://live.example.com/session",
      scrapeId: "scrape_private",
      actions: [
        {
          type: "fill",
          selector: "#password",
          text: "password=super-secret",
        },
      ],
      steps: [
        {
          ...sampleTraceReport().steps[0],
          url: "https://portal.example.com/account",
          textExcerpt:
            "Contact jane@example.com with api_key super-secret before export.",
          screenshotBase64: "not-safe-to-share",
          raw: {
            html: "<main>private portal</main>",
            token: "super-secret",
          },
        },
      ],
    };

    const redacted = redactTraceReport(report);
    const serialized = JSON.stringify(redacted);

    expect(redacted.url).toBe("[url]");
    expect(redacted.liveViewUrl).toBeUndefined();
    expect(redacted.scrapeId).toBe("[redacted]");
    expect(redacted.steps[0].screenshotBase64).toBeUndefined();
    expect(redacted.steps[0].raw).toBe("[redacted]");
    expect(serialized).not.toContain("jane@example.com");
    expect(serialized).not.toContain("not-safe-to-share");
    expect(serialized).not.toContain("https://portal.example.com");
  });

  it("keeps support summaries short and failure-centered", () => {
    const summary = traceToSupportSummary(sampleTraceReport(), {
      redacted: true,
    });

    expect(summary).toContain("Action Trace Support Summary");
    expect(summary).toContain("Failed step: step 4");
    expect(summary).toContain("Diagnosis: SELECTOR_NOT_FOUND");
    expect(summary).not.toContain("screenshotBase64");
  });
});

function sampleTraceReport(): TraceReport {
  const action = { type: "click", selector: "[data-testid='export-table']" };

  return {
    id: "trace_test",
    status: "failed",
    mode: "live",
    url: "https://books.toscrape.com/",
    createdAt: "2026-06-30T04:18:21.000Z",
    completedAt: "2026-06-30T04:18:34.742Z",
    durationMs: 13742,
    scrapeId: "scrape_test",
    failedStepIndex: 3,
    summary: {
      stepsPlanned: 4,
      stepsCompleted: 3,
      firecrawlCalls: 4,
      screenshotsCaptured: 1,
    },
    diagnosis: {
      code: "SELECTOR_NOT_FOUND",
      message: "Step 4 could not find [data-testid='export-table'].",
      evidence: [
        "Expected selector: [data-testid='export-table']",
        "Parsed HTML match count: 0",
      ],
      suggestedFix:
        "Update the selector or add a wait for the UI state that creates the target element.",
      relatedOptions: ["waitFor", "timeout", "onlyMainContent"],
    },
    warnings: [],
    actions: [
      { type: "wait", selector: ".product_pod" },
      { type: "click", selector: ".product_pod h3 a" },
      { type: "wait", milliseconds: 500 },
      action,
    ],
    checks: [
      { type: "selector_exists", selector: "[data-testid='export-table']" },
    ],
    firecrawl: defaultFirecrawlOptions,
    steps: [
      {
        index: 3,
        action,
        status: "failed",
        durationMs: 6774,
        url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
        title: "A Light in the Attic | Books to Scrape - Sandbox",
        textExcerpt: "A Light in the Attic\n\nProduct Information",
        selectorMatches: {
          "[data-testid='export-table']": 0,
        },
        screenshotBase64: "data:image/png;base64,abc123",
        generatedCode: "POST /v2/scrape with actions[0..3]",
        error: "Firecrawl could not click selector [data-testid='export-table'].",
        raw: {
          success: false,
          error: "Firecrawl could not click selector [data-testid='export-table'].",
        },
      },
    ],
  };
}

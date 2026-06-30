import { describe, expect, it } from "vitest";
import { redactTraceReport, traceToSupportSummary } from "@/lib/report-export";
import { recordedTrace } from "@/lib/recorded-trace";
import type { TraceReport } from "@/lib/trace-schema";

describe("report export", () => {
  it("removes screenshots, raw payloads, URLs, emails, and likely secrets", () => {
    const report: TraceReport = {
      ...recordedTrace,
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
          ...recordedTrace.steps[0],
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
    const summary = traceToSupportSummary(recordedTrace, { redacted: true });

    expect(summary).toContain("Action Trace Support Summary");
    expect(summary).toContain("Failed step: step 4");
    expect(summary).toContain("Diagnosis: SELECTOR_NOT_FOUND");
    expect(summary).not.toContain("screenshotBase64");
  });
});

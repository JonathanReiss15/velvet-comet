import { describe, expect, it } from "vitest";
import {
  buildDiagnosis,
  classifyStepFailure,
  evaluateChecks,
} from "@/lib/trace-analyzer";
import type { FirecrawlAction, TraceStep } from "@/lib/trace-schema";

describe("trace analyzer", () => {
  it("classifies missing click targets as selector failures", () => {
    const action: FirecrawlAction = {
      type: "click",
      selector: "[data-testid='export-table']",
    };
    const step: TraceStep = {
      index: 3,
      action,
      status: "failed",
      durationMs: 1200,
      error: "Element not found",
    };

    expect(classifyStepFailure(action, step)).toBe("SELECTOR_NOT_FOUND");
  });

  it("turns selector match counts into actionable check failures", () => {
    const action: FirecrawlAction = {
      type: "click",
      selector: "[data-testid='export-table']",
    };
    const step: TraceStep = {
      index: 3,
      action,
      status: "passed",
      durationMs: 80,
      selectorMatches: {
        "[data-testid='export-table']": 0,
      },
    };

    const result = evaluateChecks({
      checks: [
        { type: "selector_exists", selector: "[data-testid='export-table']" },
      ],
      action,
      step,
      isFinalStep: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe("SELECTOR_NOT_FOUND");
      expect(result.failure.evidence).toContain("Parsed HTML match count: 0");
    }
  });

  it("includes concrete selector guidance in the diagnosis", () => {
    const action: FirecrawlAction = {
      type: "wait",
      selector: "#dashboard-ready",
    };
    const diagnosis = buildDiagnosis("WAIT_TIMEOUT", {
      action,
      step: {
        index: 0,
        action,
        status: "failed",
        durationMs: 30000,
        error: "Timeout waiting for selector",
      },
    });

    expect(diagnosis.message).toContain("#dashboard-ready");
    expect(diagnosis.relatedOptions).toContain("timeout");
  });
});

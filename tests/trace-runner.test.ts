import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFirecrawlOptions } from "@/lib/examples";
import type { TraceStreamEvent } from "@/lib/trace-events";
import { runTrace, runTraceWithEvents } from "@/lib/trace-runner";

describe("trace runner", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FIRECRAWL_API_KEY;
  });

  it("builds a failed selector trace from mocked Firecrawl checkpoints", async () => {
    process.env.FIRECRAWL_API_KEY = "test-key";
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        actions: unknown[];
      };
      const isFinalPrefix = body.actions.length === 2;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            markdown: isFinalPrefix ? "Product page without export control" : "Catalog ready",
            html: isFinalPrefix
              ? "<main><h1>Product</h1></main>"
              : "<main><button id='ready'>Ready</button></main>",
            screenshot: "data:image/png;base64,abc123",
            metadata: {
              url: "https://example.com/product",
              title: "Mock Product",
              scrapeId: "scrape_mock",
            },
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await runTrace({
      mode: "live",
      url: "https://example.com/",
      actions: [
        { type: "wait", selector: "#ready" },
        { type: "click", selector: "[data-testid='export-table']" },
      ],
      checks: [
        { type: "selector_exists", selector: "[data-testid='export-table']" },
      ],
      firecrawl: defaultFirecrawlOptions,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(report.status).toBe("failed");
    expect(report.failedStepIndex).toBe(1);
    expect(report.diagnosis?.code).toBe("SELECTOR_NOT_FOUND");
    expect(report.steps[1].screenshotBase64).toBe(
      "data:image/png;base64,abc123",
    );
    expect(report.steps[1].selectorMatches).toEqual({
      "[data-testid='export-table']": 0,
    });
    expect(report.summary.firecrawlCalls).toBe(2);
  });

  it("emits progressive events while building a trace", async () => {
    process.env.FIRECRAWL_API_KEY = "test-key";
    const events: TraceStreamEvent[] = [];
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        actions: unknown[];
      };
      const isFinalPrefix = body.actions.length === 2;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            markdown: isFinalPrefix ? "Product page without export control" : "Catalog ready",
            html: isFinalPrefix
              ? "<main><h1>Product</h1></main>"
              : "<main><button id='ready'>Ready</button></main>",
            screenshot: "data:image/png;base64,abc123",
            metadata: {
              url: "https://example.com/product",
              title: "Mock Product",
              scrapeId: "scrape_mock",
            },
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await runTraceWithEvents(
      {
        mode: "live",
        url: "https://example.com/",
        actions: [
          { type: "wait", selector: "#ready" },
          { type: "click", selector: "[data-testid='export-table']" },
        ],
        checks: [
          { type: "selector_exists", selector: "[data-testid='export-table']" },
        ],
        firecrawl: defaultFirecrawlOptions,
      },
      (event) => {
        events.push(event);
      },
    );

    expect(report.status).toBe("failed");
    expect(events.map((event) => event.type)).toEqual([
      "trace.started",
      "step.started",
      "step.completed",
      "step.started",
      "step.failed",
      "trace.completed",
    ]);
    expect(events[0]).toMatchObject({
      type: "trace.started",
      report: {
        status: "partial",
        summary: { stepsPlanned: 2, firecrawlCalls: 0 },
      },
    });
    expect(events.at(-1)).toMatchObject({
      type: "trace.completed",
      report: { status: "failed", failedStepIndex: 1 },
    });
  });
});

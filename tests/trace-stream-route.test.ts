import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultFirecrawlOptions } from "@/lib/examples";
import type { TraceStreamEvent } from "@/lib/trace-events";
import { POST } from "@/app/api/traces/stream/route";

describe("trace stream route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FIRECRAWL_API_KEY;
  });

  it("streams trace events from a POST request", async () => {
    process.env.FIRECRAWL_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          actions: unknown[];
        };
        const isFinalPrefix = body.actions.length === 2;

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              markdown: isFinalPrefix
                ? "Product page without export control"
                : "Catalog ready",
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
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/traces/stream", {
        method: "POST",
        body: JSON.stringify({
          mode: "live",
          url: "https://example.com/",
          actions: [
            { type: "wait", selector: "#ready" },
            { type: "click", selector: "[data-testid='export-table']" },
          ],
          checks: [
            {
              type: "selector_exists",
              selector: "[data-testid='export-table']",
            },
          ],
          firecrawl: defaultFirecrawlOptions,
        }),
      }),
    );

    expect(response.headers.get("Content-Type")).toContain(
      "text/event-stream",
    );
    const text = await response.text();
    const events = text
      .trim()
      .split("\n\n")
      .map((block) => {
        const data = block
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice("data: ".length);
        return data ? (JSON.parse(data) as TraceStreamEvent) : null;
      })
      .filter((event): event is TraceStreamEvent => Boolean(event));

    expect(events.map((event) => event.type)).toContain("trace.started");
    expect(events.map((event) => event.type)).toContain("step.failed");
    expect(events.at(-1)).toMatchObject({
      type: "trace.completed",
      report: { status: "failed", failedStepIndex: 1 },
    });
  });
});

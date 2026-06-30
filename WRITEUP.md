# Action Trace Workbench

I chose feedback item **#7**, the workflow automation customer whose Firecrawl `actions` arrays have grown to fourteen steps. The core problem is not that Firecrawl cannot automate browsers. It is that when a long action chain fails, the customer gets one opaque `SCRAPE_FAILED` and has to rerun the workflow with screenshots inserted by hand just to learn whether step 3, 7, or 11 broke.

This is larger than one account. In the provided support data, **error confusion / debugging help** is the largest category: 214 of 535 tickets in the last 90 days, roughly 40%. The quoted customer is a $28k ARR Growth account with heavy actions usage, but the same observability gap shows up in protected-site failures, slow scrapes, and authenticated portal workflows. My bet is that before Firecrawl tries to automatically repair complex automations, it should make failed browser workflows explain themselves.

## What I built

I built **Action Trace Workbench**, a Next.js dashboard for debugging Firecrawl action workflows. It opens directly into a completed recorded trace, so the failure state is visible without a Firecrawl API key or credits. From there, a user can replay the bundled demo, load a live example, or paste a URL plus `actions` JSON and run it against Firecrawl.

For each run, the workbench produces a step-by-step trace:

- failed step index
- timeline with action, status, duration, URL, and error state
- checkpoint screenshot, text excerpt, raw response, generated request, and selector probe
- deterministic diagnosis code such as `SELECTOR_NOT_FOUND`, `WAIT_TIMEOUT`, or `NAVIGATION_CHANGED`
- suggested fix and related Firecrawl options
- JSON, Markdown, and redacted support-summary exports

The first demo path targets the exact customer pain: a Books to Scrape workflow succeeds through setup steps, then fails when it clicks `[data-testid='export-table']`. Instead of returning one generic scrape failure, the workbench identifies step 4, shows the page state, reports that the selector matched zero elements, and suggests updating the selector or waiting for the UI state that creates it.

## How it works

The live prototype uses Firecrawl's existing `POST /v2/scrape` endpoint with **prefix replay**. For step N, the runner sends actions `[0..N]` and requests markdown, HTML, and screenshot. The returned HTML is parsed with Cheerio so selector checks are backed by actual DOM match counts when Firecrawl returns HTML.

This is intentionally not the production architecture I would want inside Firecrawl. Prefix replay costs more credits, can drift from a single continuous browser session, and is less faithful for stateful workflows. I used it because it is honest and buildable from the public API. The production version should instrument the browser runner directly and emit native step events from one execution:

```ts
{
  runId: "run_123",
  stepIndex: 3,
  action: { type: "click", selector: "[data-testid='export-table']" },
  status: "failed",
  durationMs: 1842,
  url: "https://customer-app.example/report",
  title: "Report builder",
  screenshotUrl: "firecrawl://trace/run_123/step_3.png",
  selectorMatches: { "[data-testid='export-table']": 0 },
  error: "Element not found"
}
```

That native trace would remove replay drift, reduce cost, and make the artifact reliable enough for support tickets, customer escalations, and team-shared run history.

The main implementation path is `app/api/traces/stream/route.ts` -> `lib/trace-runner.ts` -> `lib/firecrawl-trace-client.ts` -> `lib/trace-analyzer.ts`. The stream route emits progressive trace and step events so the UI hydrates as each checkpoint finishes. I used fetch streaming instead of browser `EventSource` because this workflow needs a JSON POST body.

## What I deliberately did not build

I did **not** build a generic Playwright IDE; the product surface is Firecrawl action observability, not arbitrary browser automation authoring.

I did **not** build automatic workflow repair. The app suggests fixes, but it does not rewrite customer actions and pretend to know the right selector.

I did **not** build credential vaulting or authenticated-session management for item #11. This workbench would help show where a login failed, but credential handling is a separate security surface.

I did **not** build BYO residential proxies, LinkedIn scraping, managed extractors, or coverage-first search. Those are valid opportunities, but they are broader platform bets. This work is intentionally narrow: one repeated failure mode, solved deeply enough to demo.

I also did **not** assume Firecrawl has no debugging. The current product has adjacent surfaces: Interact Playground, Scrape Playground, Activity Logs, result inspection, and a run-level debug modal. The gap here is narrower: automatic **action-step traceability** for long `actions` workflows.

## One thing AI got wrong

The AI-assisted plan initially treated Firecrawl Interact-style JavaScript execution as the fastest route to a trace runner. That looked plausible from docs-style examples, but live testing exposed a bad assumption: generated top-level `await` snippets and Playwright-like code did not behave like a normal async script contract, and the failure looked more like a REPL execution mismatch than a customer action failure.

I caught it by testing against the local UI and live Firecrawl responses instead of trusting the generated plan. The fix was to stop translating actions into generated JavaScript and switch to `/v2/scrape` prefix replay using Firecrawl's native `actions` array. That made the demo easier to defend: live traces are backed by the same action primitives customers already use, while the UI labels the prefix-replay cost and fidelity tradeoff explicitly.

## Closing pitch

Action Trace Workbench turns "the scrape failed" into "step 4 clicked a selector that never existed on this page; here is the screenshot, selector evidence, raw response, and next fix." That directly addresses the customer quote, reduces support ambiguity, and gives Firecrawl a credible observability layer for complex browser-action workflows.

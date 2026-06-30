# Action Trace Workbench

## How I would present this in the 45-minute session

I chose feedback item **#7**, the workflow automation customer with fourteen-step Firecrawl `actions` arrays. The concrete pain is not that Firecrawl cannot run browser actions; it is that a long action chain can collapse into one opaque `SCRAPE_FAILED`. The customer then reruns the whole chain with screenshots inserted by hand just to learn whether step 3, 7, or 11 broke.

That problem is also broader than one account. In the support data, **error confusion / debugging help** is the largest category: 214 of 535 tickets in the last 90 days, about 40%. The referenced customer is a Growth account at $28k ARR with heavy actions usage, and the same observability gap also affects protected-site failures, slow scrapes, and authenticated portal workflows. My product bet is: before building a self-healing automation platform, Firecrawl should make failed browser workflows explain themselves.

## What I built

I built **Action Trace Workbench**, a live Next.js dashboard for debugging Firecrawl action workflows. The user loads one of three examples or pastes a URL plus `actions` JSON, clicks **Run**, and gets a step-by-step trace:

- failed step index
- action timeline with duration and status
- screenshot, markdown/text, and selector checkpoint evidence
- raw Firecrawl response
- deterministic diagnosis code
- suggested fix
- JSON, Markdown, and redacted support-summary export

The app opens with a bundled recorded trace so the reviewer immediately sees the finished failure state without spending credits. Live runs use the `FIRECRAWL_API_KEY` from `.env` and call Firecrawl on demand. Under the hood live mode uses **prefix replay** with `POST /v2/scrape`: for step N, it runs actions `[0..N]` and requests markdown, HTML, and screenshot. The returned HTML is parsed for selector checks, so `selector_exists` evidence is based on actual DOM match counts. Prefix replay is more expensive than native runner instrumentation, but it is honest, buildable externally, and proves the product shape without changing Firecrawl internals.

In the demo I would start on the recorded failure trace, then run the three built-in live examples if time and credits allow:

1. **Missing selector after product navigation**: Books to Scrape passes setup steps, then fails on `[data-testid='export-table']`; the workbench identifies step 4 and classifies `SELECTOR_NOT_FOUND`.
2. **Unexpected navigation**: example.com click succeeds but leaves the expected URL; the workbench classifies `NAVIGATION_CHANGED`.
3. **Wait timeout**: example.com never exposes `#dashboard-ready`; the workbench classifies `WAIT_TIMEOUT`.

The UI is Firecrawl-style on purpose: dark operator shell, compact metrics, orange primary action, timeline rows, screenshot/text/raw/code inspector, and export controls. The first thing I want the reviewer to see after a run is the answer: which step failed, what Firecrawl saw, and what I would try next.

## How to run the demo quickly

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`. The app starts on a bundled recorded trace, so the reviewer can inspect the complete failure report without a Firecrawl API key or credits. The **Replay demo** button reloads that recorded trace and walks the selection back to the failed step.

Live runs are optional. Add `FIRECRAWL_API_KEY=...` to `.env`, choose a scenario, and click **Run**. The same workflow executes through Firecrawl prefix replay. The run streams back as `text/event-stream`, so the timeline hydrates step-by-step instead of waiting for the final report. I also added `npm test`, `npm run typecheck`, and `npm run build` as the verification path.

## What I deliberately did not build

I did **not** build a generic Playwright IDE. The product surface is Firecrawl action observability, not arbitrary browser automation authoring.

I did **not** build automatic workflow repair. The app suggests fixes, but it does not rewrite customer actions and pretend to know the right answer. That should come after trace quality is trusted.

I did **not** build credential vaulting or authenticated-session management for item #11. That is a separate security/product surface. This workbench would help show where login failed, but it should not own customer credentials.

I did **not** build BYO residential proxies, LinkedIn scraping, managed extractors, or coverage-first search. Those are real opportunities, but they are either much larger platform bets or more directly competitive with surfaces Firecrawl already has. For this take-home, narrow and deep felt stronger than touching five customer asks shallowly.

I also did **not** claim Firecrawl has no debugging. While reviewing the dashboard, I found adjacent surfaces: Interact Playground, Scrape Playground, Activity Logs, result inspection, and a run-level debug modal. The gap I am targeting is narrower: **action-step traceability** for long `actions` workflows.

## Implementation walkthrough

For the code walkthrough, I would start at `app/api/traces/route.ts`, then follow:

- `lib/trace-schema.ts` for request/report validation
- `lib/examples.ts` for the live demo payloads
- `lib/trace-runner.ts` for prefix replay and checkpoint assembly
- `lib/firecrawl-trace-client.ts` for Firecrawl API calls
- `lib/trace-analyzer.ts` for deterministic diagnosis rules
- `components/workbench.tsx` for the UI flow

The progressive path is `app/api/traces/stream/route.ts`. It accepts the same POST body as the JSON route and emits events such as `trace.started`, `step.started`, `step.completed`, `step.failed`, and `trace.completed`. I used fetch streaming rather than browser `EventSource` because `EventSource` cannot send the JSON POST body this workflow needs.

The current demo stores traces in memory. That is enough for local export and reload during the session; production should use durable trace storage with retention and redaction controls because screenshots and markdown can contain sensitive page data.

The production API contract I would want Firecrawl's browser runner to emit is roughly:

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

That native event stream would remove replay drift, reduce cost, and make trace fidelity stronger than the external prototype.

## One thing AI got wrong

The AI-assisted plan initially overfit to a safe offline replay path, and it also assumed Firecrawl Interact code execution would accept generated top-level `await` code exactly as the docs examples implied. I caught both by testing against the actual local UI and the live Firecrawl API.

The fix was to make the product live-only, then switch the runner to `/v2/scrape` prefix replay. That made the demo less synthetic and easier to defend in the interview: every trace shown in the UI is backed by real Firecrawl responses, including the messy failure behavior.

## Closing pitch

Action Trace Workbench turns a long Firecrawl action failure from "the scrape failed" into "step 4 clicked a selector that never existed on this page, here is the screenshot, markdown, raw error, and next fix." That directly addresses the customer quote, reduces support ambiguity, and gives Firecrawl a credible observability layer for complex browser-action workflows.

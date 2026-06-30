# Action Trace Workbench

The core problem is not that Firecrawl cannot automate browsers. It is that when a long action chain fails, the customer gets one opaque `SCRAPE_FAILED` and has to rerun the workflow with screenshots inserted by hand just to learn whether step **3**, **7**, or **11** broke.

This is larger than one account. The same observability gap shows up in protected-site failures, slow scrapes, and authenticated portal workflows. My bet is that before Firecrawl tries to automatically repair complex automations, it should make failed browser workflows explain themselves.

**tl;dr: I chose feedback item #7 because a 14-step Firecrawl `actions` chain collapsing into one `SCRAPE_FAILED` is a crisp, high-frequency observability gap. The direct account is $28k ARR, but the bigger signal is support leverage: error confusion / debugging help is 214 of 535 tickets in the last 90 days, roughly 40%.**

## What I built

I built **Action Trace Workbench**, a Next.js dashboard for debugging Firecrawl action workflows. It opens directly into a completed recorded trace, so the failure state is visible without a Firecrawl API key or credits. From there, a user can replay the bundled demo, load a live example, or paste a URL plus `actions` JSON and run it against Firecrawl.

For each run, the workbench produces a step-by-step trace:

- failed step index
- timeline with action, status, duration, URL, and error state
- checkpoint screenshot, text excerpt, raw response, generated request, and selector probe
- deterministic diagnosis code such as `SELECTOR_NOT_FOUND`, `WAIT_TIMEOUT`, or `NAVIGATION_CHANGED`
- suggested fix and related Firecrawl options
- JSON, Markdown, and redacted support-summary exports

The first demo path targets the exact customer pain: a Books to Scrape workflow succeeds through setup steps, then fails when it clicks `[data-testid='export-table']`. Instead of returning one generic scrape failure, the workbench identifies step **4**, shows the page state, reports that the selector matched **zero** elements, and suggests updating the selector or waiting for the UI state that creates it.

**tl;dr: I built a working debugger for Firecrawl `actions`: failed step, page state, screenshot, selector evidence, raw response, and exportable support context.**

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

**tl;dr: The demo uses public Firecrawl APIs honestly; the production version should move the same trace model into the native browser runner.**

## What I deliberately did not build

I did **not** build a generic Playwright IDE; the product surface is Firecrawl action observability, not arbitrary browser automation authoring.

I did **not** build automatic workflow repair. The app suggests fixes, but it does not rewrite customer actions and pretend to know the right selector.

I did **not** build credential vaulting or authenticated-session management for item **#11**. This workbench would help show where a login failed, but credential handling is a separate security surface.

I did **not** build **Coverage-First Search**, even though the product decision in `docs/coverage-first-search.md` is a strong idea. Issue **#1** has the largest direct revenue signal at **$180k ARR**, Q3 renewal pressure, expansion to **two** more teams, and **thousands** of nightly batch queries where completeness matters more than speed. I moved away from it for this build for three product reasons:

- The maintained Search API already exposes many of the primitives Coverage-First Search would compose: sources, categories, geo/time filters, optional scraping, and domain filters. A credible demo would need to prove better coverage and ranking quality, not just show another wrapper around search.
- The support data pointed harder at debugging as a repeated operational pain: **214 of 535 tickets** were **error confusion / debugging help**, while **search relevance / result count** was **38 tickets** in the same **last 90 days**.
- Action Trace Workbench is a narrower **72-hour** wedge with an obvious before/after: one opaque failure becomes the failed step, screenshot, selector evidence, and next fix. Coverage-First Search remains a good future workflow layer, but the harder part to prove is evaluation quality across many query classes.

I also did **not** assume Firecrawl has no debugging. The current product has adjacent surfaces: Interact Playground, Scrape Playground, Activity Logs, result inspection, and a run-level debug modal. The gap here is narrower: automatic **action-step traceability** for long `actions` workflows.

**tl;dr: I did not build a broad automation platform, automatic repair, credential management, or Coverage-First Search. I kept the demo centered on making one repeated failure mode obvious.**

## One thing AI got wrong

The AI-assisted plan initially treated Firecrawl Interact-style JavaScript execution as the fastest route to a trace runner. That looked plausible from docs-style examples, but live testing exposed a bad assumption: generated top-level `await` snippets and Playwright-like code did not behave like a normal async script contract, and the failure looked more like a REPL execution mismatch than a customer action failure.

I caught it by testing against the local UI and live Firecrawl responses instead of trusting the generated plan. The fix was to stop translating actions into generated JavaScript and switch to `/v2/scrape` prefix replay using Firecrawl's native `actions` array. That made the demo easier to defend: live traces are backed by the same action primitives customers already use, while the UI labels the prefix-replay cost and fidelity tradeoff explicitly.

**tl;dr: AI initially picked an attractive implementation path that did not survive live testing, so I replaced it with native Firecrawl action replay.**

## How I would test it with users

I would start with the issue **#7** customer and a small group of users from recent **error confusion / debugging help** tickets, including open-source users who shared reproducible failing workflows. The ask would be simple: give us one real failing `actions` chain, run it through the trace view, and tell us whether the failed step, screenshot, selector evidence, and suggested fix would have changed their next debugging move.

I would measure adoption by looking for repeat trace runs, exported support summaries attached to tickets, reduction in blind reruns with manually inserted screenshots, and time from `SCRAPE_FAILED` to first useful customer edit. For beta success, I would want at least a few heavy-action users to use traces on their own failures without a support prompt, because that proves this is a product surface rather than just an internal support tool.

**tl;dr: I would validate this on real failing workflows, then measure whether users rerun traces, export them to support, and reach useful fixes faster.**

## Closing pitch

Action Trace Workbench turns "the scrape failed" into "step **4** clicked a selector that never existed on this page; here is the screenshot, selector evidence, raw response, and next fix." That directly addresses the customer quote, reduces support ambiguity, and gives Firecrawl a credible observability layer for complex browser-action workflows.

The next layer is to use an LLM with Firecrawl's Interact engine to propose a patch: update a selector, insert a targeted wait, recover from a navigation change, or replay a candidate fix in a sandbox before the user accepts it. The trace makes that safe because the model would be working from concrete page state and DOM evidence instead of guessing from one generic error.

**tl;dr: First make action failures explain themselves; then use the trace as evidence for LLM-assisted repair suggestions or sandboxed auto-patches.**

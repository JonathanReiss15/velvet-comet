# Action Trace Workbench

I chose feedback item **#7**: long Firecrawl `actions` chains currently collapse into one opaque `SCRAPE_FAILED`, so users rerun the workflow with screenshots inserted by hand just to learn which step broke. The direct customer is a $28k ARR growth-plan account, but the broader reason is support leverage: `error confusion / debugging help` is **214 of 535** support tickets in the supplied 90-day data, roughly **40%**. My bet is that before Firecrawl tries to automatically repair complex automations, failed browser workflows should explain themselves.

## What I built

I built **Action Trace Workbench**, a Next.js dashboard for debugging Firecrawl action workflows. The app assumes `FIRECRAWL_API_KEY` is set in `.env`, loads a live Firecrawl example by default, and lets users paste a URL, `actions` JSON, checks, and Firecrawl options before running a trace.

Each run produces a step-by-step trace:

- failed step index
- timeline with action, status, duration, URL, and error state
- checkpoint screenshot, text excerpt, raw response, generated request, and selector probe
- deterministic diagnosis code such as `SELECTOR_NOT_FOUND`, `WAIT_TIMEOUT`, or `NAVIGATION_CHANGED`
- suggested fix and related Firecrawl options
- JSON, Markdown, and redacted support-summary exports

The main demo mirrors the customer pain. A Books to Scrape workflow succeeds through setup, then fails when it clicks `[data-testid='export-table']`. Instead of one generic scrape failure, the live trace identifies step **4**, shows the page state, reports that the selector matched **zero** elements, and suggests updating the selector or waiting for the UI state that creates it.

## How it works

The live prototype uses Firecrawl's existing `POST /v2/scrape` endpoint with **prefix replay**. For step N, the runner sends actions `[0..N]` and requests markdown, HTML, and screenshot. Returned HTML is parsed with Cheerio so selector checks use actual DOM match counts when Firecrawl returns HTML. The route streams progressive events to the UI from `app/api/traces/stream/route.ts` through `lib/trace-runner.ts`, `lib/firecrawl-trace-client.ts`, and `lib/trace-analyzer.ts`.

Prefix replay is intentionally not the production architecture. It costs more credits, can drift from a single continuous browser session, and is weaker for stateful authenticated workflows. I used it because it is honest and buildable from the public API. The production version should instrument Firecrawl's browser runner directly and emit native step events from one execution: action started, action completed or failed, duration, URL/title, screenshot, selector evidence, and raw runner error.

## What I deliberately did not build

I did **not** build a generic Playwright IDE. The product surface is Firecrawl action observability, not arbitrary browser automation authoring.

I did **not** build automatic workflow repair. The app suggests fixes, but it does not rewrite customer actions or pretend to know the right selector from one failed run.

I did **not** build credential vaulting or authenticated-session management for item **#11**. This workbench would help show where a login failed, but credentials and session isolation are separate security surfaces.

I did **not** build Coverage-First Search for item **#1**, even though it has the largest direct ARR signal at $180k. Search already has many relevant primitives, and a credible coverage product would need ranking-quality evaluation across many query classes. For this 72-hour build, the support data and demo clarity pointed harder at action traceability: one opaque failure becomes a failed step, screenshot, selector evidence, and next fix.

I also did **not** claim Firecrawl has no debugging. Firecrawl has adjacent surfaces such as Interact Playground, Scrape Playground, Activity Logs, result inspection, and run-level debugging. The narrower gap is automatic **action-step traceability** for long `actions` workflows.

## One thing AI got wrong

The AI-assisted plan initially treated Firecrawl Interact-style JavaScript execution as the fastest route to a trace runner. That looked plausible from docs-style examples, but live testing exposed a bad assumption: generated top-level `await` snippets and Playwright-like code did not behave like a normal async script contract, and the failure looked more like a REPL mismatch than a customer action failure.

I caught it by testing against the local UI and live Firecrawl responses instead of trusting the generated plan. The fix was to stop translating actions into generated JavaScript and switch to `/v2/scrape` prefix replay using Firecrawl's native `actions` array. That made the demo easier to defend: live traces are backed by the same action primitives customers already use, while the UI labels the prefix-replay cost and fidelity tradeoff directly.

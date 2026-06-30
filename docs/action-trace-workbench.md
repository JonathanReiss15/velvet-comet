# Product Decisions v2: Action Trace Workbench

## Decision

Build **Action Trace Workbench**, focused on issue **#7** from the README feedback.

The clean product definition:

> Action Trace Workbench is a debugging layer for Firecrawl browser-action runs. It turns one opaque `SCRAPE_FAILED` into a step-by-step execution trace with the failed action, page state, screenshot, and suggested fix.

This is the best differentiated bet if we do not want to compete directly with another coverage-search submission:

- It targets a concrete developer pain with a crisp before/after demo.
- It maps to the largest support category: `error confusion / debugging help` is 214 of 535 support tickets in the last 90 days, roughly 40%.
- It starts from a paying growth customer at $28k ARR with heavy `actions` usage and usage up 6%.
- It composes Firecrawl's existing `actions`, screenshot, HTML, markdown, and scrape primitives instead of pretending those primitives do not exist.
- It gives Firecrawl a product-quality observability story for workflows that currently fail as a black box.

## Problem

Firecrawl supports powerful browser actions: click, wait, fill, scroll, screenshots, JavaScript execution, and extraction. That is enough to automate complex pages, but the debugging surface is too thin when a long action chain breaks.

The customer in issue #7 has action arrays up to fourteen steps. When one step fails, the whole run comes back as one `SCRAPE_FAILED`. The user then re-runs the workflow with screenshots inserted manually just to determine whether step 3, step 7, or step 11 broke.

That is a bad failure mode for a developer product:

- The browser did useful intermediate work, but the product discards the trace.
- The customer pays in credits, engineering time, and trust for every blind retry.
- Support has to reason from an opaque final error rather than a structured failure artifact.
- The user learns to debug around Firecrawl instead of through Firecrawl.

The product goal is not "make every action chain succeed." The goal is:

> When an action chain fails, Firecrawl should make the failure obvious enough that the customer knows the next edit to try.

## Why This Makes Sense To Build

### 1. It Solves The Largest Support-Load Pattern

The ticket data says error confusion and debugging help is the largest category:

| Category | 90d tickets |
| --- | ---: |
| error confusion / debugging help | 214 |
| scrape failures on protected sites | 96 |
| latency complaints | 41 |
| search relevance / result count | 38 |
| monitoring / change detection | 33 |

This matters because issue #7 is not just one customer asking for convenience. It is a specific manifestation of the largest repeated support burden: users cannot tell what went wrong.

Action Trace Workbench turns support conversations from:

> "My scrape failed, can you look?"

into:

> "Step 8 timed out waiting for `[data-testid=export]`; the page URL changed after step 6 and the button is no longer present."

That is a product improvement and a support-cost reduction.

### 2. It Has A Clear Revenue Story Despite Lower Direct ARR

Issue #1 has the biggest direct ARR signal at $180k, but issue #7 has stronger support leverage and a more differentiated demo.

Direct referenced revenue:

- Issue #7 customer: $28k ARR, growth plan, usage up 6%, heavy actions usage.

Adjacent revenue it can influence:

- Issue #2: $42k ARR, scrape failures on a protected retail domain. Better diagnostics would not replace proxy work, but it would identify whether failures are selectors, timeouts, blocked pages, or proxy/protection symptoms.
- Issue #8: $31k ARR, inline scrape tail-latency pain. Trace timing would show whether slow runs are waiting on navigation, network, selectors, or extraction.
- Issue #11: trial customer doubling month over month, evaluating migration from its own Playwright cluster. Session/auth automation becomes more credible when Firecrawl can explain mid-run login and navigation failures.

Conservative potential impact:

- Retain and expand heavy-action Growth/Scale users by reducing debugging friction.
- Reduce support volume in the largest ticket bucket.
- Make higher-credit browser automation workflows safer to adopt.
- Create a Growth+ or Scale/Enterprise feature surface: trace history, failure screenshots, step timings, selector diagnostics, and team-sharable debug reports.

The revenue argument is not "this one customer is the biggest account." It is:

> Complex browser automation burns credits and support time. Better observability makes those workflows cheaper to operate, easier to trust, and easier to sell.

### 3. It Is Narrow And Demoable

A strong take-home demo needs to be explainable in 45 minutes. Action Trace Workbench is visually obvious:

- Paste URL and action array.
- Run trace.
- See each step in a timeline.
- Failed step is highlighted.
- Screenshot and markdown show what the browser saw.
- Suggested fix is attached.

That lands faster than a broad platform claim. A reviewer can immediately understand the customer pain and inspect the implementation.

### 4. It Differentiates From Coverage-First Search

Coverage-first search is still a good product idea, but another candidate already built a deep version of it. Competing on the same wedge would push us toward a monorepo/eval/worker architecture contest.

Action Trace Workbench lets us compete on a different axis:

- developer experience
- product observability
- support reduction
- Firecrawl-specific debugging insight
- visual demo quality

It also shows that we read the feedback set as product operators, not just as engineers chasing the largest ARR number.

## What We Build

### Product Surface

Build a local web app called **Action Trace Workbench**.

The first screen should be the working tool, not a landing page.

Inputs:

- URL
- action array JSON
- optional `waitFor`
- optional extraction format
- optional success checks:
  - selector should exist
  - page should contain text
  - markdown should not be empty
  - URL should match a pattern
- max step timeout
- trace mode:
  - `fast`: replay fewer checkpoints
  - `full`: inspect every step

Outputs:

- run status: `complete`, `failed`, `partial`, `invalid`
- step timeline
- first failed step index
- action type and parameters
- duration per step
- page URL/title when available
- screenshot at each checkpoint or at least on failure
- markdown/text excerpt after each checkpoint
- diagnostic classification
- suggested fix
- exportable debug report

### Core User Flow

1. User pastes a failing Firecrawl action workflow.
2. App validates the action JSON locally.
3. App runs a trace.
4. Each step becomes a row in a timeline.
5. The app stops at the first failure or failed assertion.
6. The app shows the screenshot/page state at the failure point.
7. The user edits the action array and reruns.

### Diagnostic Categories

The app should classify common failure shapes:

| Code | Meaning |
| --- | --- |
| `SELECTOR_NOT_FOUND` | A click/fill/wait target was not present in the page state. |
| `WAIT_TIMEOUT` | The page did not reach the expected state before timeout. |
| `NAVIGATION_CHANGED` | A prior action moved the browser to an unexpected URL or route. |
| `EMPTY_EXTRACTION` | Actions succeeded but the final extraction returned too little content. |
| `POSSIBLE_BLOCK` | Page content suggests bot protection, login wall, captcha, or access denial. |
| `JAVASCRIPT_ERROR` | An `executeJavascript` action failed or returned an unexpected value. |
| `UNSUPPORTED_ACTION` | Action shape is invalid or not supported by the trace runner. |
| `FIRECRAWL_ERROR` | Firecrawl returned an upstream error that cannot be narrowed locally. |

Suggested fixes should be concrete:

- "Selector never appeared. Try waiting for a parent container first."
- "This click navigated to `/login`; add a login/session step or use a persistent profile."
- "The page was still loading when extraction ran; increase `waitFor` or add a wait action after step 5."
- "The screenshot shows a bot check; try `proxy: auto`, a different location, or interact/live debugging."

## Demo Architecture

For the take-home, use a pragmatic trace shim on top of existing Firecrawl primitives.

```text
Next.js UI
  |
  | POST /api/traces
  v
Trace Orchestrator
  |
  +-- validate actions JSON
  +-- plan checkpoints
  +-- execute prefix runs through Firecrawl /v2/scrape
  +-- collect screenshot + markdown + metadata
  +-- classify failure
  +-- return trace report
```

### Prefix Replay Strategy

Existing Firecrawl does not expose a native per-action trace in the public API. The demo can still prove the product shape by replaying action prefixes:

- Run actions `[0]`.
- Run actions `[0, 1]`.
- Run actions `[0, 1, 2]`.
- Continue until the full workflow completes or a checkpoint fails.

At each checkpoint, request observable output:

- screenshot
- markdown
- HTML for selector assertions
- page metadata when available

This is intentionally more expensive than a production implementation, but it is honest and buildable in 72 hours.

The production implementation would instrument Firecrawl's browser runner directly:

```text
single browser session
  step 1 -> emit trace event
  step 2 -> emit trace event
  step 3 -> emit trace event
  failure -> capture screenshot, DOM excerpt, URL, selector diagnostics
```

The demo proves the API contract and UX before asking Firecrawl to change its runner internals.

### Server Components

`TraceController`

- Accepts trace requests from the UI.
- Validates input with Zod.
- Applies limits: max steps, max screenshots, max total runtime.
- Returns structured API errors for invalid action JSON.

`TracePlanner`

- Converts a full action array into checkpoints.
- Supports `full` mode, one checkpoint per step.
- Supports `fast` mode, binary-search or coarse checkpointing for long workflows.

`FirecrawlTraceClient`

- Calls `/v2/scrape`.
- Adds the action prefix.
- Requests screenshot/markdown formats.
- Applies timeout and retry policy.
- Preserves raw Firecrawl error information.

`TraceAnalyzer`

- Compares each checkpoint with the previous checkpoint.
- Runs success checks.
- Detects likely failure class.
- Produces suggested fix text.

`TraceStore`

- For the demo, local in-memory or filesystem JSON is enough.
- Stores recent traces so the UI can reload a run and export a report.

### Client Components

`TraceForm`

- URL input.
- JSON editor textarea.
- example action chains.
- validation feedback before submit.

`StepTimeline`

- fixed-height step list.
- status icons: pending, running, passed, failed, skipped.
- action type, selector, elapsed time.

`CheckpointInspector`

- screenshot pane.
- markdown excerpt pane.
- raw Firecrawl response/error.
- page metadata.

`DiagnosisPanel`

- first failed step.
- failure code.
- likely cause.
- suggested fix.
- "copy debug report" action.

`ExportPanel`

- JSON trace export.
- Markdown support report.

## API Sketch

### Create Trace

`POST /api/traces`

Request:

```json
{
  "url": "https://example.com/dashboard",
  "actions": [
    { "type": "wait", "milliseconds": 1000 },
    { "type": "click", "selector": "[data-testid='filters']" },
    { "type": "fill", "selector": "input[name='q']", "text": "invoices" },
    { "type": "click", "selector": "button[type='submit']" }
  ],
  "checks": [
    { "type": "selector_exists", "selector": ".results-table" },
    { "type": "markdown_contains", "text": "Invoice" }
  ],
  "mode": "full",
  "timeoutMs": 30000
}
```

Response:

```json
{
  "id": "trace_01J...",
  "status": "failed",
  "url": "https://example.com/dashboard",
  "startedAt": "2026-06-30T00:00:00.000Z",
  "durationMs": 18420,
  "failedStepIndex": 2,
  "diagnosis": {
    "code": "SELECTOR_NOT_FOUND",
    "message": "Step 3 tried to fill `input[name='q']`, but that selector was not visible after step 2.",
    "suggestedFix": "Add a wait for the filter panel container or update the selector. The screenshot shows the panel did not open after the click."
  },
  "steps": [
    {
      "index": 0,
      "action": { "type": "wait", "milliseconds": 1000 },
      "status": "passed",
      "durationMs": 2100,
      "screenshotUrl": "/api/traces/trace_01J/steps/0/screenshot",
      "markdownExcerpt": "..."
    },
    {
      "index": 1,
      "action": { "type": "click", "selector": "[data-testid='filters']" },
      "status": "passed",
      "durationMs": 2400,
      "screenshotUrl": "/api/traces/trace_01J/steps/1/screenshot",
      "markdownExcerpt": "..."
    },
    {
      "index": 2,
      "action": { "type": "fill", "selector": "input[name='q']", "text": "invoices" },
      "status": "failed",
      "durationMs": 30000,
      "error": "Selector not found before timeout.",
      "screenshotUrl": "/api/traces/trace_01J/steps/2/screenshot"
    }
  ]
}
```

### Export Trace

`GET /api/traces/{id}/export?format=markdown`

The export should include:

- URL
- action array
- first failed step
- diagnosis
- step timeline
- screenshot links
- markdown excerpts
- raw Firecrawl error payloads where safe
- suggested next actions

## Production Architecture

The demo uses prefix replay because it can be built externally. The productized Firecrawl version should be runner-native.

```text
Firecrawl API
  |
  v
Browser Action Runner
  |
  +-- beforeStep hook
  +-- execute action
  +-- afterStep hook
  +-- onFailure hook
  |
  v
Trace Event Stream
  |
  +-- step_started
  +-- step_completed
  +-- step_failed
  +-- screenshot_captured
  +-- console_error
  +-- network_error
  +-- extraction_completed
  |
  v
Trace Store + Debug UI + Support Tools
```

Native runner support unlocks:

- one browser session instead of prefix replay
- lower credit cost
- exact selector error from the runner
- screenshots only on failed or configured steps
- console/network log capture
- DOM snippets around selectors
- integration with support `/ask`
- trace IDs attached to failed scrape responses

The future API could add:

```json
{
  "trace": {
    "enabled": true,
    "screenshots": "on_failure",
    "includeDomSnippets": true,
    "includeConsole": true
  }
}
```

And failed scrape responses could include:

```json
{
  "success": false,
  "error": "SCRAPE_FAILED",
  "traceId": "trace_01J...",
  "failedAction": {
    "index": 10,
    "type": "click",
    "selector": ".export-button",
    "reason": "selector not found"
  }
}
```

## What To Build For The Take-Home

Build enough to make the value obvious:

1. **Trace request form**
   - URL input.
   - action JSON textarea.
   - two or three example failing workflows.
   - client/server validation.

2. **Prefix replay runner**
   - Runs Firecrawl scrape for action prefixes.
   - Captures screenshot and markdown.
   - Retries transient Firecrawl failures once.
   - Applies hard max steps and timeout.

3. **Timeline UI**
   - Shows every attempted step.
   - Highlights the first failed step.
   - Shows duration and action details.
   - Provides screenshot/markdown inspection.

4. **Diagnosis engine**
   - Classifies failure into a small code set.
   - Generates deterministic suggested fixes.
   - Does not require an LLM for the core diagnosis.

5. **Export**
   - JSON trace export.
   - Markdown debug report for support or teammates.

6. **Live example workflows**
   - Include three preloaded public-page examples.
   - Always execute them through Firecrawl so the demo reflects real API behavior.

## What Not To Build

### Do Not Build A General Playwright IDE

This is not a replacement for Playwright Inspector. Firecrawl users want to debug Firecrawl action arrays and scrape outcomes, not write arbitrary browser tests.

### Do Not Build Auth Credential Vaulting

Issue #11 raises credential handling, but secure credential storage is a separate platform feature. The trace workbench can show where login failed, but it should not own credential vaulting in the take-home.

### Do Not Build A Full Self-Healing Agent

The app can suggest fixes. It should not silently rewrite customer workflows and rerun them as if repaired. Automatic repair is a future feature after trace quality is proven.

### Do Not Claim To Fix Anti-Bot Reliability

If a page blocks Firecrawl, the product should identify the symptom and recommend existing controls such as `proxy: auto`, location, headers, wait settings, or interact/live debugging. It should not claim to defeat protected sites.

### Do Not Over-Promise Production Efficiency

Prefix replay is a demo shim. The doc and UI should say that a native Firecrawl implementation would emit trace events during one browser session.

## Issues Covered

### #7: Action-Step Debugging

Covered directly.

The customer asked for the failed step index and a page view at failure. The workbench provides both, plus timings, screenshots, markdown excerpts, and suggested fixes.

### #8: Tail Latency Visibility

Partially helped.

The product does not make slow pages faster, but it shows where time was spent: navigation, waits, selectors, extraction, or Firecrawl upstream latency.

### #11: Authenticated Portal Automation

Partially helped.

The product does not solve credential handling or session persistence. It does help answer "what happens when login fails halfway through a run" by making login-state failures visible in the trace.

### #2: Protected Site Failures

Partially helped.

The product does not add BYO proxies, but it helps determine whether a failure looks like bot protection, selector drift, page changes, or a normal timeout.

## Why This Is Better Than Coverage-First Search For Differentiation

Coverage-First Search is a strong product bet, but it is now a crowded comparison point. Another candidate built a broad systems-heavy version with saturation, tests, API, CLI, web console, and evals.

Action Trace Workbench differentiates the submission:

- different customer problem
- different product persona
- more visual demo
- stronger support-cost tie-in
- clearer Firecrawl-specific developer experience
- lower risk of looking like a weaker copy of another solution

It also shows a valuable product instinct: the highest ARR item is not always the best take-home wedge if another solution already occupies it and if support data points to a repeatable pain elsewhere.

## Success Metrics

Demo metrics:

- failed step identified correctly
- screenshot captured at failure
- percentage of steps with useful checkpoint data
- time to diagnosis vs manual screenshot insertion
- report export completeness

Product metrics:

- reduction in `error confusion / debugging help` support tickets
- reduction in average support resolution time for action-chain failures
- repeat usage by accounts with complex `actions`
- increased successful reruns after trace suggestions
- expansion/retention among Growth and Scale accounts using browser automation

Commercial metrics:

- attach rate for trace history on Growth+ plans
- Scale/Enterprise adoption for trace retention and team-sharable debug reports
- lower support cost per heavy browser-automation account
- increased confidence moving Playwright-like workflows onto Firecrawl

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Prefix replay is expensive. | Cap max steps, offer `fast` mode, clearly describe native runner tracing as the production path. |
| Replaying prefixes can change page state differently than one continuous session. | Label trace confidence, support persistent profiles where available, and avoid claiming exact equivalence for stateful workflows. |
| Screenshots may contain sensitive customer data. | Store locally for the demo, redact exports by default, and propose retention controls for production. |
| Diagnosis may be wrong. | Use deterministic, evidence-backed language: "likely cause" and "suggested fix," with raw trace evidence visible. |
| Some failures are upstream/proxy issues. | Classify as `FIRECRAWL_ERROR` or `POSSIBLE_BLOCK`; do not force a selector diagnosis. |

## Why This Is Buildable In 72 Hours

The demo can be credible without changing Firecrawl internals:

- Use existing `/v2/scrape` with action prefixes.
- Request screenshot and markdown outputs.
- Store trace results in local JSON or memory.
- Build a single Next.js dashboard with form, timeline, inspector, and export.
- Include live example traces so the reviewer can exercise the product against public pages.
- Keep the diagnosis rules deterministic and explainable.

The code remains easy to walk through:

```text
request -> validate -> plan prefixes -> run Firecrawl -> analyze checkpoints -> render trace
```

That is narrow enough to finish, and useful enough to feel like a real Firecrawl product.

## One-Line Interview Pitch

> I did not build another search workflow. I built the missing observability layer for Firecrawl actions: when a 14-step scrape fails, the user gets the failed step, the page state, a screenshot, and a concrete next fix instead of one opaque `SCRAPE_FAILED`.

# Action Trace Workbench Plan

## Summary

Action Trace Workbench is a focused observability layer for long Firecrawl `actions` chains. It turns one opaque scrape failure into a step-by-step report with the failed action, screenshot, page text, parsed selector evidence, raw response excerpt, and suggested fix.

The demo is intentionally narrow:

- paste a URL and Firecrawl-style `actions` JSON
- run the workflow through live Firecrawl prefix replay
- stream timeline updates as each prefix checkpoint completes
- inspect the first failed step
- export JSON, Markdown, or a redacted support summary

The first screen preloads the Books to Scrape example request. Clicking **Run** executes the workflow live through Firecrawl using `FIRECRAWL_API_KEY` from `.env`.

## Product Bet

The chosen customer problem is feedback item #7: long action arrays fail as one `SCRAPE_FAILED`, forcing users to rerun with screenshots inserted by hand.

This is worth building because it addresses the largest support pattern in the supplied data: `error confusion / debugging help` is 214 of 535 tickets in the last 90 days. The product goal is not automatic repair. The goal is to make the next edit obvious.

## Current Architecture

```text
Next.js Workbench
  |
  | GET /api/examples
  |   returns live example requests
  |
  | POST /api/traces
  v
Trace Runner
  |
  +-- validate action/check schema
  +-- emit trace.started with pending timeline rows
  +-- for each action index N:
  |     +-- POST /v2/scrape with actions[0..N]
  |     +-- request markdown, html, and screenshot
  |     +-- parse returned HTML for selector assertions
  |     +-- capture metadata, duration, screenshot, text excerpt, raw response excerpt
  |     +-- emit step.completed or step.failed
  |     +-- stop on first action failure or failed check
  |
  +-- classify the failure deterministically
  +-- save report in memory
  +-- emit trace.completed
  +-- return report
```

Prefix replay is more expensive than production runner instrumentation, but it is honest, externally buildable, and proves the product shape without Firecrawl internals.

## Mode

`live` calls Firecrawl `/v2/scrape` once per action prefix using the local `FIRECRAWL_API_KEY`.

The cost/fidelity panel states the prefix-replay tradeoff directly.

## Checks

Supported checks:

- `selector_exists`: evaluated against HTML returned by the checkpoint scrape using a DOM parser.
- `url_matches`: evaluated against checkpoint metadata URL.
- `text_contains`: evaluated against markdown excerpt.
- `min_text_length`: evaluated against markdown excerpt.

The important implementation change is that selector checks are no longer cosmetic. If HTML is returned, the trace stores a selector match count and uses that count as evidence.

## Exports

Routes:

- `POST /api/traces/stream`
- `GET /api/traces/:id/export?format=json`
- `GET /api/traces/:id/export?format=markdown`
- `GET /api/traces/:id/export?format=support`

`POST /api/traces/stream` returns SSE-formatted chunks over a fetch stream. The app uses fetch streaming rather than native `EventSource` so it can preserve the existing JSON POST body.

Each route accepts `redacted=true`.

Redaction removes or masks:

- screenshots
- raw payloads
- live view URLs
- scrape IDs
- URL-like strings
- emails
- likely API tokens, passwords, and secrets

This matters because screenshots, markdown, HTML, and raw responses can contain portal data.

## Production Path

The production version should not use prefix replay. Firecrawl should emit native runner step events from the same browser execution:

- action started
- action succeeded/failed
- duration
- URL/title after step
- screenshot on failure or checkpoint
- text/HTML excerpt for assertions
- raw runner error

That would reduce cost, avoid replay drift, and make trace fidelity stronger. The demo makes that future path explicit instead of hiding the tradeoff.

## Modules

- `components/workbench.tsx`: dashboard shell, live run flow, timeline, inspector, diagnosis, and redacted exports.
- `lib/trace-schema.ts`: Zod schemas for actions, checks, trace reports, and modes.
- `lib/examples.ts`: live example payloads.
- `lib/firecrawl-trace-client.ts`: `/v2/scrape` client for prefix replay.
- `lib/trace-runner.ts`: live trace orchestration, HTML selector counting, report assembly.
- `lib/trace-analyzer.ts`: deterministic diagnosis and suggested fixes.
- `lib/report-export.ts`: Markdown, support summary, and redaction logic.
- `lib/trace-store.ts`: in-memory trace storage for completed runs.

## Non-Goals

- Do not build a generic Playwright IDE.
- Do not build automatic workflow repair.
- Do not claim Firecrawl has no debugging at all.
- Do not claim prefix replay is the ideal production implementation.
- Do not own credential vaulting or authenticated-session management.
- Do not claim to solve protected-site reliability.

## Demo Script

1. Start with the preloaded Books to Scrape request.
2. Click **Run** to execute the workflow live through Firecrawl.
3. Show the before/after panel: one native-style failure vs step-level evidence.
4. Click the failed step in the timeline.
5. Show screenshot, text excerpt, raw response excerpt, and selector match count.
6. Show diagnosis and suggested fix.
7. Toggle redaction and export support summary.

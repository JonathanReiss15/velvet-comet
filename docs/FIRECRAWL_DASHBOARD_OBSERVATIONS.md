# Firecrawl Dashboard Observations

Observed in Safari while logged into the Firecrawl dashboard on 2026-06-30.

## Question

Does Firecrawl already have a product surface similar to **Action Trace Workbench**?

Short answer: **not in the dashboard surfaces inspected.**

The closest existing feature is a **Debug issue** modal on a completed public playground run. That modal reads the run and appears to draft an AI recommendation from logs. It is adjacent, but it is not the same product shape as Action Trace Workbench:

- no action-array input
- no step-by-step timeline
- no failed action index
- no screenshot per action/checkpoint
- no selector/wait diagnostic categories
- no prefix replay or runner-native trace view
- no support-ready trace report for long `actions` chains

So the positioning should be careful:

> Firecrawl has run-level debugging assistance and request/activity visibility, but not an action-step trace workbench for long browser-action workflows.

## Surfaces Inspected

### Overview

The dashboard overview shows:

- endpoint cards: Search, Scrape, Interact, Crawl
- credits chart for the last seven days
- concurrent browser usage
- API key card
- agent integration cards and snippets
- integration and example project sections

No trace/debugging product is visible on the overview. The current navigation has no "Traces", "Debug", "Runs", or "Action history" area beyond Activity Logs.

### Interact Playground

The Interact page is the most relevant existing surface.

Observed structure:

- top subnav: `Interact Playground`, `Sessions`, `Profiles`
- `New Session` button
- `Get Code` button
- URL entry
- prompt/send area after a session starts
- empty-state cards:
  - Click and Fill
  - Prompt Actions
  - Extract Behind Interaction
  - Live Browser State

What it solves:

- start a live browser interaction session
- use natural-language prompts or code-oriented interaction
- watch live browser state
- manage sessions and persistent profiles

What it does not show:

- deterministic `actions` array debugger
- per-action timeline
- first failed action index
- failed selector/wait diagnosis
- screenshot/markdown checkpoint history
- exportable debug report

### Interact Sessions

The Sessions tab shows active/previous session management. In the current account it showed no active sessions.

This confirms Firecrawl has a session concept and live browser workflow, but the page is session inventory, not debugging evidence.

### Interact Profiles

The Profiles tab showed:

- zero persistent profiles
- empty state explaining persistent profiles save browser state between sessions
- link to persistent-session docs

This is relevant to authenticated workflows, but it does not overlap with Action Trace Workbench except as a future option to make prefix replay more faithful.

### Scrape Playground

The Scrape playground includes:

- endpoint switcher: Search, Scrape, Parse, Map, Crawl
- URL input
- attachment control
- format selector
- get-code button
- start-scraping button
- recent run cards

The scrape options panel includes:

- Main content only
- Parse PDF
- Enhanced mode
- Exclude tags
- Include tags
- Wait
- Timeout
- Max age
- Reset settings

No action-step trace, per-action failure detail, or trace mode appeared in the visible scrape options.

### Public Playground Run Detail

Opened an existing completed scrape result. It showed:

- run URL/title
- output tabs: Markdown, HTML, Screenshot, JSON
- copy/download controls
- "Interact with this page" button
- "Debug issue" button

The output view is useful for inspecting scrape results, but it is result-oriented, not trace-oriented.

The **Debug issue** button opened a modal labeled `Debug /scrape issue` with states such as:

- Reading your run...
- Investigating logs...
- Drafting a recommendation...

This is the only similar feature found. It looks like a run-level support/debug assistant. It is not an action-chain trace UI because it does not show per-step browser execution or failed action state.

Important implication:

- Our demo should not claim "Firecrawl has no debugging at all."
- It should claim "Firecrawl has run-level support/debug help, but not action-step observability for long `actions` chains."

### Activity Logs

Activity Logs shows a table with:

- endpoint
- URL/query
- status
- credits
- time
- actions/download
- filters for endpoint, API key, date range
- export CSV

This is account-level request history. It is useful for audit and usage review, but it does not expose:

- request body/actions
- sub-step timing
- browser state
- screenshots
- selector failures
- per-step logs

### Monitoring

Monitoring is for web change detection:

- monitors
- alerts in the last 24 hours
- last activity
- search monitors
- new monitor
- get code
- active/paused filters

This does not overlap with action debugging.

### Usage

Usage shows:

- credits remaining
- recent usage chart
- filters by time range, API key, endpoint
- browser concurrency section

This is cost/performance visibility. It can inspire our trace cost/count display, but it is not a debugging surface.

### Agent

Agent is a research-preview prompt surface:

- prompt entry
- model selector
- add URLs
- CSV upload
- daily run count
- example prompts
- new-session sidebar

It is agentic data gathering, not action-array debugging.

## Product Gap Summary

Action Trace Workbench remains differentiated if it focuses on:

- Firecrawl `actions` array input
- step-by-step trace timeline
- first failed step index
- screenshot and markdown at each checkpoint
- selector/wait/navigation/block diagnosis
- deterministic suggested fixes
- JSON and Markdown trace export
- trace confidence note for prefix replay vs native runner traces

The strongest contrast:

| Existing Firecrawl dashboard | Action Trace Workbench |
| --- | --- |
| request-level Activity Logs | step-level action timeline |
| run-level "Debug issue" modal | evidence-backed failed-step diagnosis |
| Interact live sessions | reproducible action-array debug reports |
| Scrape output tabs | screenshot/markdown checkpoints per action |
| usage/credits charts | trace cost, checkpoints, durations, failed step |

## Dashboard Design Notes

### Overall App Shell

Firecrawl's authenticated dashboard uses a dark, dense operations-console feel:

- near-black background
- left sidebar navigation
- top header with team selector and utility buttons
- thin grid-like background lines
- subtle panel borders
- compact cards and tables
- orange accent for active states and primary actions

The UI is functional and restrained, not a marketing layout.

For our demo:

- first screen should be the workbench itself
- use a left sidebar or compact app header
- keep content dense and tool-like
- avoid hero/landing-page copy

### Color

Observed palette:

- page background: near-black
- panels/cards: black to very dark gray
- borders: low-contrast dark gray
- primary accent: Firecrawl orange
- active sidebar item: dark orange/brown background with orange text/icon
- success: green text for completed statuses
- muted text: gray
- code snippets: orange highlights on dark background

Approximate CSS direction:

```css
--background: #050505;
--panel: #0b0b0b;
--panel-2: #111111;
--border: #242424;
--muted: #8a8a8a;
--foreground: #f4f4f4;
--accent: #ff4d00;
--accent-soft: rgba(255, 77, 0, 0.12);
--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;
```

### Layout

Patterns to mirror:

- left nav around 220px wide
- page content centered with a max-width container
- large page title with short subtitle
- horizontal metric cards
- segmented controls/tabs
- tables with thin dividers
- cards arranged in a grid
- fixed bottom/right support bubble should not be copied, but we can leave room for overlays

For Action Trace Workbench:

- left panel: trace form and examples
- main panel: step timeline
- right panel or lower panel: checkpoint inspector/diagnosis
- top row: status, failed step, duration, Firecrawl calls, screenshots captured

### Components

Useful Firecrawl patterns:

- pill badges: `NEW`, `LIVE`, status labels
- orange primary buttons
- icon-only utility buttons
- segmented tabs for endpoint/mode switching
- small all-caps section labels
- cards with 1px borders and 8-12px radius
- table rows with large vertical spacing
- code blocks in monospace with orange syntax emphasis
- empty states centered in panels with small icon and short text

For our app:

- use badges for `FAILED`, `PASSED`, `PARTIAL`, `LIVE`
- use orange primary CTA: `Run trace`
- use muted secondary buttons: `Load example`, `Copy report`, `Export JSON`
- use icon buttons for open/copy/download/settings
- use tabs/segmented control for `Timeline`, `Screenshot`, `Markdown`, `Raw`

### Typography

Observed style:

- clean sans-serif
- page headings large but not oversized
- cards use compact labels and small descriptive copy
- status and endpoint labels often all-caps
- code/CLI snippets use monospace

For our app:

- avoid oversized marketing text
- use compact dashboard labels
- use monospace for selectors, URLs, action JSON, and error codes
- keep line length short inside diagnostic cards

### Motion And State

Observed states:

- loading spinners in page center or modal
- disabled buttons until required inputs exist
- active nav states are persistent and clearly highlighted
- modal uses overlay dimming and a white/light panel on the public playground page

For our app:

- show trace progress as checkpoint rows transition from pending to running to passed/failed
- prefer skeleton/timeline progression over a lone spinner
- failed step should become visually obvious immediately
- use modal only for export/share; main trace evidence should stay in-page

## UI Recommendations For The Demo

1. Make the first viewport a tool: URL/action JSON on the left, trace result on the right.
2. Use Firecrawl orange for primary actions and active/failure focus, but use red only for actual failure state.
3. Keep panels dark, bordered, compact, and data-dense.
4. Add a top metric strip:
   - Status
   - Failed step
   - Duration
   - Firecrawl calls
   - Screenshots
5. Build a timeline with stable step rows:
   - action icon
   - step index
   - action type
   - selector/text
   - duration
   - status badge
6. Add a diagnosis panel that reads like Firecrawl support:
   - likely cause
   - evidence
   - suggested fix
   - raw error link/collapsible section
7. Include a `Run-level debug exists; step trace is new` positioning line in the writeup, not in the app UI.

## Competitive/Product Positioning Note

The discovered `Debug issue` modal means our product should avoid saying "Firecrawl has no debugging." The sharper position is:

> Firecrawl already has request logs, result inspection, and run-level debug assistance. The missing layer is action-step observability: a deterministic trace that shows which browser action failed, what the page looked like at that moment, and what to change next.

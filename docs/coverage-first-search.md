# Archived Product Option: Coverage-First Search

This was an earlier product direction considered during discovery, not the final submission. The final shipped demo and one-page rationale are in `WRITEUP.md`, focused on Action Trace Workbench for feedback item #7.

## Decision

Build **Coverage-First Search**, focused on issue **#1** and secondarily issue **#5** from the README feedback.

The clean product definition:

> Coverage-First Search is a source coverage and discovery layer. It does not answer the research question; it proves whether the right evidence was found.

This is the strongest revenue-weighted and product-generalizable bet:

- Issue #1 is an enterprise customer at $180k ARR with Q3 renewal and expansion pressure.
- The customer runs thousands of batch queries and explicitly values completeness over speed.
- The product generalizes beyond one customer: competitive intelligence, market maps, diligence, sales intelligence, research agents, and analyst workflows all need better source coverage.
- The solution composes existing Firecrawl strengths instead of pretending to replace them.

## Why This Is Not Deep Research

Issue #1 mentions the deprecated Deep Research endpoint because it was "closer to right" than normal search. That does not mean we should rebuild Deep Research.

Deep Research is an autonomous research product shape:

- The system searches, extracts, reasons, and synthesizes.
- The primary output is a final answer or final analysis.
- The user delegates the research task to the system.

Coverage-First Search is a coverage product shape:

- The system runs a controlled search plan across source lanes.
- The primary output is a ranked source inventory with coverage metrics.
- The user keeps ownership of the analysis/report.
- Every result is auditable: original query, expanded query, lane, source type, score, scrape status, and suppression reason.

That distinction matters commercially. The $180k ARR customer sells landscape reports where completeness is the product. They are not asking Firecrawl to write the report; they are saying their analysts still find missing sources by hand after Firecrawl search. The high-value wedge is therefore "find the missing sources and prove coverage," not "generate a prose report."

This also avoids competing with Firecrawl's product direction. Firecrawl's Deep Research endpoint is deprecated in favor of Search, and the maintained Search API already exposes the primitives this product composes: sources, categories, geo/time filters, optional scraping, and domain filters. Coverage-First Search is the workflow layer on top.

References:

- Firecrawl Deep Research docs: https://docs.firecrawl.dev/features/alpha/deep-research
- Firecrawl Search API docs: https://docs.firecrawl.dev/api-reference/endpoint/search

## Issues Covered

### #1: High-Recall Source Discovery

Covered directly.

The customer does not need another `limit: 100` search mode or a generic autonomous researcher. They need a way to discover sources that generic search ranking misses: trade publications, regional press, niche forums, documents, and non-obvious sources.

Coverage-First Search addresses this by:

- expanding each query into multiple search lanes
- using Firecrawl search across diversified queries
- scraping selected candidates for richer ranking signals
- deduping SEO duplicates
- ranking by relevance, uniqueness, source diversity, freshness, authority, and depth
- producing an auditable source pack for analysts
- comparing discovered sources against a baseline search lane

This directly maps to the customer's statement that completeness is the product.

### #5: Intent-Aware Search Ranking

Covered as a supporting capability.

Issue #5 asks for search ranking that changes by use case: news, buying research, domain credibility, comparison pages, etc. Coverage-First Search includes an `intent` parameter and score weighting:

- `competitive_landscape`: uniqueness and source diversity
- `news_watch`: freshness and primary reporting
- `buying_research`: comparison language and concrete evaluation criteria
- `technical_research`: primary docs, GitHub, PDFs, and standards

This does not require Firecrawl to expose a new native rerank parameter immediately. It proves the product shape on top of current Firecrawl capabilities while keeping the output as ranked sources, not synthesized answers.

## Issues Partially Helped

### #3: Markdown Dedupe

Partially helped, but not the main product.

The demo dedupes candidate sources and can fingerprint markdown to suppress near-identical pages. It should not claim to solve Firecrawl markdown duplication inside a single scraped page. A native `dedupe: true` scrape option may still be useful, but the revenue impact is lower because the user is free/open-source and already has a workaround.

### #4: Fast Snippet-Only Search

Partially related, but intentionally not optimized.

Coverage-First Search can use search metadata before scraping, which avoids paying latency and credits for every page. However, issue #4 is a self-serve latency/cost feature for a hobby-plan Discord bot. Useful product improvement, but it is not the highest ARR opportunity in this dataset.

### #8: Tail Latency

Partially mitigated for batch workflows.

The product tolerates slow pages through async runs, partial results, retries, and per-lane warnings. It does not solve inline p95/p99 scrape latency for user-facing paste-a-link flows. That deserves separate infrastructure work.

## Issues Not Built

### #2: BYO Residential Proxies

Not building.

The stated pain is scrape reliability on a protected retail domain, not proxy controls as an end in itself. Firecrawl already has proxy modes such as `basic`, `enhanced`, and `auto`, where `auto` can retry with enhanced proxies after basic failures. A better product direction would be reliability diagnostics or smarter automatic escalation, not handing customers raw proxy plumbing.

Also, BYO proxy support is operationally complex:

- credential storage
- abuse prevention
- billing attribution
- debugging customer-owned infrastructure
- inconsistent proxy quality
- support burden when failures are outside Firecrawl's control

It may be valuable later for sophisticated enterprise users, but it is not the best 72-hour take-home target.

### #6: "Understand Any Website" Enterprise Assistant

Not building.

This is a seven-figure prospect, but the ask is too broad for this demo. "Any website" includes public docs, supplier portals, and eventual intranet content. The product surface could sprawl into crawl, RAG, auth, permissions, freshness, citations, private networking, and enterprise security.

Firecrawl already has building blocks for this direction: scrape, crawl, search, monitor, interact, and agent. A credible demo would need a much narrower wedge than "understand any website." Coverage-First Search is narrower, easier to explain, and still relevant to enterprise research workflows.

### #7: Action-Step Debugging

Not building.

This is a real developer-experience problem and the support-ticket data shows "error confusion / debugging help" is the largest support category. Still, this solution would mainly improve retention/support load for users with complex `actions` chains.

It is less directly revenue-expansion oriented than issue #1, and current Firecrawl guidance points complex interactions toward `interact` rather than ever-longer scrape action arrays. A strong future product here would be an action trace with step-level screenshots and selector diagnostics.

### #8: Faster Tail Latency / Slow-Page Prediction

Not building.

Important, but infrastructure-heavy. Fixing p99 hangs likely requires fleet-level telemetry, browser lifecycle tuning, timeout policy, proxy behavior, and page-class prediction. A local demo could fake the UX but would not prove the actual reliability improvement.

Coverage-First Search avoids inline latency sensitivity by making long-running work asynchronous and batch-oriented.

### #9: Managed Extractors / Self-Healing Collectors

Not building.

This is attractive and probably commercially meaningful. The customer pays $38k ARR and wants to stop maintaining 40+ extraction jobs. Firecrawl monitoring and JSON-mode change tracking already cover part of the "tell me when data changes or extraction drifts" workflow.

The hard part is the "maintains itself" promise. A real solution would need extractor versioning, regression tests, schema-drift detection, repair suggestions, confidence scoring, and possibly human approval workflows. That is too large for a narrow 72-hour demo.

Coverage-First Search borrows the same managed-workflow principle, but applies it to source discovery where the demo can be complete.

### #10: LinkedIn Structured Data

Not building.

The revenue signal is real: a scale-plan customer pays another LinkedIn data vendor more than their Firecrawl bill. But this is the most operationally and legally risky option in the set, and it is overfit to one adversarial target.

Reasons:

- LinkedIn data scraping has a long litigation history, including hiQ Labs v. LinkedIn. The Ninth Circuit narrowed some CFAA risk for public-web scraping, but later proceedings still left contract and terms-of-service risk in play.
- LinkedIn's own policies prohibit crawlers, bots, scraping tools, fake accounts, and automated activity that violates its User Agreement.
- Maintaining access at scale would likely require brittle account operations, anti-bot evasion, session management, phone/email verification, captcha handling, and frequent adaptation to LinkedIn countermeasures.
- Any system dependent on fake or disposable accounts creates trust, compliance, and support risk. It is a bad fit for a general Firecrawl product surface.
- Even if it works for one customer, it does not generalize cleanly to the broader Firecrawl customer base.

Useful references:

- Ninth Circuit opinion in hiQ Labs v. LinkedIn: https://cdn.ca9.uscourts.gov/datastore/opinions/2022/04/18/17-16783.pdf
- LinkedIn prohibited software guidance: https://www.linkedin.com/help/linkedin/answer/a1341387
- LinkedIn User Agreement: https://www.linkedin.com/legal/user-agreement

The better product stance is to avoid building "LinkedIn at scale" as the take-home project and focus on durable web-data workflows that do not depend on adversarial sockpuppet-account maintenance.

### #11: Authenticated Vendor Portal Automation

Not building.

This is strategically interesting because Firecrawl `interact` and persistent profiles are relevant. It could become a high-value product for agent companies moving off their own Playwright clusters.

However, a serious solution needs:

- secure credential handling
- session persistence
- profile isolation
- failure recovery
- login-state diagnostics
- captcha and MFA policy
- customer-specific portal variance

That is a large platform feature. It is also less proven in ARR today because the customer is still on trial, despite strong usage growth. For this take-home, Coverage-First Search is more immediately revenue-grounded and easier to demo honestly.

## Why This Is Not Overfit

Coverage-First Search starts from one urgent enterprise customer, but the underlying job is common:

- analysts need complete source packs
- AI research products need better evidence retrieval
- sales and market-intelligence products need non-obvious sources
- diligence teams need source diversity and audit trails
- batch pipelines need partial results and failure transparency

The product is a reusable workflow around Firecrawl's existing primitives:

- search to discover
- scrape to enrich
- classification to understand source type
- dedupe to reduce SEO noise
- ranking to optimize for the user's intent
- export to plug into downstream reports or data pipelines

That makes it more durable than a one-off integration for a single protected site.

## Why This Is Buildable In 72 Hours

The demo can be credible without inventing new Firecrawl infrastructure:

- Use existing Firecrawl search and scrape endpoints.
- Implement query expansion locally.
- Implement dedupe and scoring locally.
- Store run state in SQLite or local JSON.
- Build a simple dashboard with run creation, progress, ranked results, warnings, and export.
- Use real Firecrawl calls when an API key is present.
- Include seeded demo data for repeatable review.

The code remains explainable in a 45-minute call because every result can be traced from original query to expanded query to search result to scrape enrichment to final ranking decision.

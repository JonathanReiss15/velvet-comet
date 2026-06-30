import type { FirecrawlAction, FirecrawlOptions, TraceCheck } from "@/lib/trace-schema";

type ExampleDefinition = {
  id: string;
  label: string;
  description: string;
  url: string;
  actions: FirecrawlAction[];
  checks: TraceCheck[];
  expectedOutcome: string;
};

export const defaultFirecrawlOptions: FirecrawlOptions = {
  waitFor: 500,
  timeout: 30000,
  mobile: false,
  proxy: "auto",
  onlyMainContent: true
};

export const examples: ExampleDefinition[] = [
  {
    id: "selector-missing-books",
    label: "Missing selector after product navigation",
    description: "Runs against Books to Scrape and fails when a non-existent export control is clicked.",
    url: "https://books.toscrape.com/",
    actions: [
      { type: "wait", selector: ".product_pod" },
      { type: "click", selector: ".product_pod h3 a" },
      { type: "wait", milliseconds: 500 },
      { type: "click", selector: "[data-testid='export-table']" }
    ],
    checks: [{ type: "selector_exists", selector: "[data-testid='export-table']" }],
    expectedOutcome: "SELECTOR_NOT_FOUND"
  },
  {
    id: "navigation-changed-example",
    label: "Click navigates away from expected page",
    description: "Runs against example.com and catches the link click leaving the expected URL.",
    url: "https://example.com/",
    actions: [
      { type: "wait", milliseconds: 500 },
      { type: "click", selector: "a" },
      { type: "wait", milliseconds: 500 }
    ],
    checks: [{ type: "url_matches", pattern: "^https://example\\.com/?$" }],
    expectedOutcome: "NAVIGATION_CHANGED"
  },
  {
    id: "wait-timeout-example",
    label: "Waits for a dashboard selector that never appears",
    description: "Runs against example.com and waits for a selector that is absent from the live page.",
    url: "https://example.com/",
    actions: [{ type: "wait", selector: "#dashboard-ready" }],
    checks: [{ type: "selector_exists", selector: "#dashboard-ready" }],
    expectedOutcome: "WAIT_TIMEOUT"
  }
];

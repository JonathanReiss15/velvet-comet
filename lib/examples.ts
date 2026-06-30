import { buildDiagnosis } from "@/lib/trace-analyzer";
import type {
  DiagnosisCode,
  FirecrawlAction,
  FirecrawlOptions,
  TraceCheck,
  TraceReport,
  TraceStep
} from "@/lib/trace-schema";

export type ExampleDefinition = {
  id: string;
  label: string;
  description: string;
  url: string;
  actions: FirecrawlAction[];
  checks: TraceCheck[];
  expectedDiagnosis: DiagnosisCode;
};

export const defaultFirecrawlOptions: FirecrawlOptions = {
  waitFor: 500,
  timeout: 60000,
  mobile: false,
  proxy: "auto",
  onlyMainContent: true
};

export const examples: ExampleDefinition[] = [
  {
    id: "selector-missing-books",
    label: "Missing selector after product navigation",
    description: "Valid setup steps reach a product page, then the export button selector never appears.",
    url: "https://books.toscrape.com/",
    actions: [
      { type: "wait", selector: ".product_pod" },
      { type: "click", selector: ".product_pod h3 a" },
      { type: "wait", milliseconds: 500 },
      { type: "click", selector: "[data-testid='export-table']" }
    ],
    checks: [{ type: "selector_exists", selector: "[data-testid='export-table']" }],
    expectedDiagnosis: "SELECTOR_NOT_FOUND"
  },
  {
    id: "navigation-changed-example",
    label: "Click navigates away from expected page",
    description: "A valid click leaves the expected route, so a URL-state check catches the break.",
    url: "https://example.com/",
    actions: [
      { type: "wait", milliseconds: 500 },
      { type: "click", selector: "a" },
      { type: "wait", milliseconds: 500 }
    ],
    checks: [{ type: "url_matches", pattern: "^https://example\\.com/?$" }],
    expectedDiagnosis: "NAVIGATION_CHANGED"
  },
  {
    id: "wait-timeout-example",
    label: "Waits for a dashboard selector that never appears",
    description: "The page loads normally, but the dashboard readiness selector is absent.",
    url: "https://example.com/",
    actions: [{ type: "wait", selector: "#dashboard-ready" }],
    checks: [{ type: "selector_exists", selector: "#dashboard-ready" }],
    expectedDiagnosis: "WAIT_TIMEOUT"
  }
];

export function getExample(id: string | undefined) {
  return examples.find((example) => example.id === id) ?? null;
}

export function getFixtureReport(exampleId: string) {
  if (exampleId === "selector-missing-books") return selectorMissingReport();
  if (exampleId === "navigation-changed-example") return navigationChangedReport();
  if (exampleId === "wait-timeout-example") return waitTimeoutReport();
  return null;
}

export function buildGenericFixtureReport(params: {
  id: string;
  url: string;
  actions: Array<Record<string, unknown>>;
  checks: TraceCheck[];
  firecrawl: FirecrawlOptions;
}): TraceReport {
  const createdAt = "2026-06-30T12:00:00.000Z";
  const steps = params.actions.map<TraceStep>((action, index) => ({
    index,
    action,
    status: "passed",
    durationMs: 280 + index * 90,
    url: params.url,
    title: "Fixture trace checkpoint",
    textExcerpt:
      "Fixture mode validated the action shape and produced a synthetic checkpoint. Use live mode to execute against Firecrawl.",
    screenshotBase64: svgScreenshotBase64({
      title: "Fixture checkpoint",
      subtitle: `Step ${index + 1} passed`,
      url: params.url,
      status: "passed"
    }),
    raw: { fixture: true }
  }));

  return {
    id: params.id,
    status: "passed",
    mode: "fixture",
    url: params.url,
    createdAt,
    completedAt: "2026-06-30T12:00:01.120Z",
    durationMs: steps.reduce((total, step) => total + step.durationMs, 0),
    failedStepIndex: null,
    summary: {
      stepsPlanned: params.actions.length,
      stepsCompleted: params.actions.length,
      firecrawlCalls: 0,
      screenshotsCaptured: steps.length
    },
    diagnosis: null,
    warnings: ["Generic fixture mode does not contact Firecrawl."],
    actions: params.actions,
    checks: params.checks,
    firecrawl: params.firecrawl,
    steps
  };
}

function selectorMissingReport(): TraceReport {
  const example = examples[0];
  const createdAt = "2026-06-30T12:00:00.000Z";
  const steps: TraceStep[] = [
    {
      index: 0,
      action: example.actions[0],
      status: "passed",
      durationMs: 612,
      url: "https://books.toscrape.com/",
      title: "All products | Books to Scrape - Sandbox",
      textExcerpt:
        "Books to Scrape. We love being scraped. A Light in the Attic, Tipping the Velvet, Soumission, Sharp Objects...",
      screenshotBase64: svgScreenshotBase64({
        title: "Books to Scrape",
        subtitle: "Product grid is present",
        url: "https://books.toscrape.com/",
        status: "passed"
      }),
      generatedCode: "await page.waitForSelector('.product_pod', { timeout: stepTimeoutMs });",
      raw: { fixture: true }
    },
    {
      index: 1,
      action: example.actions[1],
      status: "passed",
      durationMs: 974,
      url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      title: "A Light in the Attic | Books to Scrape - Sandbox",
      textExcerpt:
        "A Light in the Attic. £51.77. In stock. Product Description: It's hard to imagine a world without A Light in the Attic.",
      screenshotBase64: svgScreenshotBase64({
        title: "A Light in the Attic",
        subtitle: "Detail page loaded after product click",
        url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
        status: "passed"
      }),
      generatedCode: "await page.click('.product_pod h3 a', { timeout: stepTimeoutMs });",
      raw: { fixture: true }
    },
    {
      index: 2,
      action: example.actions[2],
      status: "passed",
      durationMs: 501,
      url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      title: "A Light in the Attic | Books to Scrape - Sandbox",
      textExcerpt:
        "A Light in the Attic. Product Information. UPC a897fe39b1053632. Product Type Books. Availability In stock.",
      screenshotBase64: svgScreenshotBase64({
        title: "Product detail",
        subtitle: "No export controls in page body",
        url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
        status: "passed"
      }),
      generatedCode: "await page.waitForTimeout(500);",
      raw: { fixture: true }
    },
    {
      index: 3,
      action: example.actions[3],
      status: "failed",
      durationMs: 30000,
      url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      title: "A Light in the Attic | Books to Scrape - Sandbox",
      textExcerpt:
        "A Light in the Attic. The page contains product details, pricing, and availability. It does not contain export-table controls.",
      screenshotBase64: svgScreenshotBase64({
        title: "Selector missing",
        subtitle: "[data-testid='export-table'] never appeared",
        url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
        status: "failed"
      }),
      generatedCode: "await page.click(\"[data-testid='export-table']\", { timeout: stepTimeoutMs });",
      error: "Timeout 30000ms exceeded waiting for selector [data-testid='export-table']",
      raw: { fixture: true, selector: "[data-testid='export-table']" }
    }
  ];
  const failedStep = steps[3];

  return baseFixtureReport({
    id: `fixture_${example.id}`,
    example,
    createdAt,
    completedAt: "2026-06-30T12:00:32.087Z",
    durationMs: 32087,
    failedStepIndex: 3,
    steps,
    diagnosis: buildDiagnosis("SELECTOR_NOT_FOUND", {
      step: failedStep,
      action: example.actions[3],
      extraEvidence: [
        "Previous checkpoint was the product detail page, not an export UI.",
        "Text excerpt did not include export controls."
      ]
    })
  });
}

function navigationChangedReport(): TraceReport {
  const example = examples[1];
  const createdAt = "2026-06-30T12:04:00.000Z";
  const steps: TraceStep[] = [
    {
      index: 0,
      action: example.actions[0],
      status: "passed",
      durationMs: 502,
      url: "https://example.com/",
      title: "Example Domain",
      textExcerpt:
        "Example Domain. This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination.",
      screenshotBase64: svgScreenshotBase64({
        title: "Example Domain",
        subtitle: "Initial page matches expected URL",
        url: "https://example.com/",
        status: "passed"
      }),
      generatedCode: "await page.waitForTimeout(500);",
      raw: { fixture: true }
    },
    {
      index: 1,
      action: example.actions[1],
      status: "failed",
      durationMs: 811,
      url: "https://www.iana.org/domains/example",
      title: "IANA-managed Reserved Domains",
      textExcerpt:
        "IANA-managed Reserved Domains. Certain domains are set aside, and nominally registered to IANA, for specific policy or technical purposes.",
      screenshotBase64: svgScreenshotBase64({
        title: "Unexpected navigation",
        subtitle: "Click moved the browser to iana.org",
        url: "https://www.iana.org/domains/example",
        status: "failed"
      }),
      generatedCode: "await page.click('a', { timeout: stepTimeoutMs });",
      error: "URL https://www.iana.org/domains/example did not match ^https://example\\.com/?$",
      raw: { fixture: true, check: "url_matches" }
    },
    {
      index: 2,
      action: example.actions[2],
      status: "skipped",
      durationMs: 0,
      generatedCode: "await page.waitForTimeout(500);",
      error: "Skipped after first failed check.",
      raw: { fixture: true }
    }
  ];
  const failedStep = steps[1];

  return baseFixtureReport({
    id: `fixture_${example.id}`,
    example,
    createdAt,
    completedAt: "2026-06-30T12:04:01.313Z",
    durationMs: 1313,
    failedStepIndex: 1,
    steps,
    diagnosis: buildDiagnosis("NAVIGATION_CHANGED", {
      step: failedStep,
      action: example.actions[1],
      checkFailure: {
        code: "NAVIGATION_CHANGED",
        message: "The click succeeded, but the post-step URL no longer matched the expected route.",
        evidence: [
          "Expected URL pattern: ^https://example\\.com/?$",
          "Actual URL: https://www.iana.org/domains/example"
        ]
      }
    })
  });
}

function waitTimeoutReport(): TraceReport {
  const example = examples[2];
  const createdAt = "2026-06-30T12:08:00.000Z";
  const steps: TraceStep[] = [
    {
      index: 0,
      action: example.actions[0],
      status: "failed",
      durationMs: 30000,
      url: "https://example.com/",
      title: "Example Domain",
      textExcerpt:
        "Example Domain. This page has a heading, a paragraph, and a More information link. It does not expose #dashboard-ready.",
      screenshotBase64: svgScreenshotBase64({
        title: "Wait timeout",
        subtitle: "#dashboard-ready was absent",
        url: "https://example.com/",
        status: "failed"
      }),
      generatedCode: "await page.waitForSelector('#dashboard-ready', { timeout: stepTimeoutMs });",
      error: "Timeout 30000ms exceeded waiting for selector #dashboard-ready",
      raw: { fixture: true, selector: "#dashboard-ready" }
    }
  ];
  const failedStep = steps[0];

  return baseFixtureReport({
    id: `fixture_${example.id}`,
    example,
    createdAt,
    completedAt: "2026-06-30T12:08:30.000Z",
    durationMs: 30000,
    failedStepIndex: 0,
    steps,
    diagnosis: buildDiagnosis("WAIT_TIMEOUT", {
      step: failedStep,
      action: example.actions[0],
      extraEvidence: ["The normal Example Domain body text was visible, so the page itself loaded."]
    })
  });
}

function baseFixtureReport(params: {
  id: string;
  example: ExampleDefinition;
  createdAt: string;
  completedAt: string;
  durationMs: number;
  failedStepIndex: number;
  steps: TraceStep[];
  diagnosis: TraceReport["diagnosis"];
}): TraceReport {
  return {
    id: params.id,
    status: "failed",
    mode: "fixture",
    url: params.example.url,
    createdAt: params.createdAt,
    completedAt: params.completedAt,
    durationMs: params.durationMs,
    failedStepIndex: params.failedStepIndex,
    summary: {
      stepsPlanned: params.example.actions.length,
      stepsCompleted: params.steps.filter((step) => step.status === "passed").length,
      firecrawlCalls: 0,
      screenshotsCaptured: params.steps.filter((step) => Boolean(step.screenshotBase64)).length
    },
    diagnosis: params.diagnosis,
    warnings: ["Fixture mode is deterministic and does not contact Firecrawl."],
    actions: params.example.actions,
    checks: params.example.checks,
    firecrawl: defaultFirecrawlOptions,
    steps: params.steps
  };
}

function svgScreenshotBase64(params: {
  title: string;
  subtitle: string;
  url: string;
  status: "passed" | "failed";
}) {
  const statusColor = params.status === "passed" ? "#22c55e" : "#ef4444";
  const title = escapeXml(params.title);
  const subtitle = escapeXml(params.subtitle);
  const url = escapeXml(params.url);
  const svg = `<svg width="960" height="600" viewBox="0 0 960 600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="960" height="600" fill="#101010"/>
  <rect x="24" y="24" width="912" height="552" rx="10" fill="#f7f7f7"/>
  <rect x="24" y="24" width="912" height="54" rx="10" fill="#e8e8e8"/>
  <circle cx="54" cy="51" r="7" fill="#ff5f57"/>
  <circle cx="78" cy="51" r="7" fill="#ffbd2e"/>
  <circle cx="102" cy="51" r="7" fill="#28c840"/>
  <rect x="135" y="39" width="685" height="24" rx="12" fill="#ffffff"/>
  <text x="156" y="56" fill="#525252" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13">${url}</text>
  <rect x="70" y="126" width="820" height="120" rx="8" fill="#ffffff" stroke="#d5d5d5"/>
  <text x="100" y="174" fill="#161616" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700">${title}</text>
  <text x="102" y="212" fill="#555555" font-family="Inter, Arial, sans-serif" font-size="20">${subtitle}</text>
  <rect x="100" y="286" width="260" height="30" rx="5" fill="#dedede"/>
  <rect x="100" y="334" width="710" height="18" rx="4" fill="#e7e7e7"/>
  <rect x="100" y="366" width="652" height="18" rx="4" fill="#e7e7e7"/>
  <rect x="100" y="398" width="520" height="18" rx="4" fill="#e7e7e7"/>
  <rect x="100" y="464" width="180" height="42" rx="6" fill="${statusColor}"/>
  <text x="122" y="491" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">${params.status.toUpperCase()}</text>
</svg>`;
  return Buffer.from(svg).toString("base64");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import { defaultFirecrawlOptions, examples } from "@/lib/examples";
import type { TraceReport } from "@/lib/trace-schema";

const example = examples[0];
const createdAt = "2026-06-30T04:18:21.000Z";
const completedAt = "2026-06-30T04:18:34.742Z";

export const recordedTrace: TraceReport = {
  id: "recorded_selector_missing_books",
  status: "failed",
  mode: "recorded",
  url: example.url,
  createdAt,
  completedAt,
  durationMs: 13742,
  scrapeId: "scrape_recorded_demo",
  failedStepIndex: 3,
  summary: {
    stepsPlanned: example.actions.length,
    stepsCompleted: 3,
    firecrawlCalls: 4,
    screenshotsCaptured: 4
  },
  diagnosis: {
    code: "SELECTOR_NOT_FOUND",
    message: "Step 4 could not find [data-testid='export-table'].",
    evidence: [
      "Expected selector: [data-testid='export-table']",
      "Parsed HTML match count: 0",
      "Checkpoint URL: https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      "Checkpoint title: A Light in the Attic | Books to Scrape - Sandbox",
      "Raw error: Firecrawl could not click selector [data-testid='export-table']."
    ],
    suggestedFix: "Update the selector or add a wait for the UI state that creates the target element.",
    relatedOptions: ["waitFor", "timeout", "onlyMainContent"]
  },
  warnings: [
    "Recorded demo trace bundled for review. Click Run to execute the same action chain through live Firecrawl prefix replay."
  ],
  actions: example.actions,
  checks: example.checks,
  firecrawl: defaultFirecrawlOptions,
  steps: [
    {
      index: 0,
      action: example.actions[0],
      status: "passed",
      durationMs: 2418,
      url: "https://books.toscrape.com/",
      title: "All products | Books to Scrape - Sandbox",
      textExcerpt: "Books to Scrape\n\nA Light in the Attic\nTipping the Velvet\nSoumission\nSharp Objects\nSapiens: A Brief History of Humankind",
      selectorMatches: {
        "[data-testid='export-table']": 0
      },
      screenshotBase64: screenshotSvg("Catalog ready", "Step 1 found .product_pod", "Grid of book cards is visible."),
      generatedCode: "POST /v2/scrape with actions[0..0]",
      raw: {
        success: true,
        data: {
          metadata: {
            url: "https://books.toscrape.com/",
            title: "All products | Books to Scrape - Sandbox",
            scrapeId: "scrape_recorded_demo"
          }
        }
      }
    },
    {
      index: 1,
      action: example.actions[1],
      status: "passed",
      durationMs: 3896,
      url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      title: "A Light in the Attic | Books to Scrape - Sandbox",
      textExcerpt: "A Light in the Attic\n\nGBP51.77\n\nIt's hard to imagine a world without A Light in the Attic.",
      selectorMatches: {
        "[data-testid='export-table']": 0
      },
      screenshotBase64: screenshotSvg("Product page", "Step 2 clicked .product_pod h3 a", "The browser is now on a product detail page."),
      generatedCode: "POST /v2/scrape with actions[0..1]",
      raw: {
        success: true,
        data: {
          metadata: {
            url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
            title: "A Light in the Attic | Books to Scrape - Sandbox",
            scrapeId: "scrape_recorded_demo"
          }
        }
      }
    },
    {
      index: 2,
      action: example.actions[2],
      status: "passed",
      durationMs: 654,
      url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      title: "A Light in the Attic | Books to Scrape - Sandbox",
      textExcerpt: "A Light in the Attic\n\nProduct Information\nUPC: a897fe39b1053632\nProduct Type: Books\nPrice excluding tax: GBP51.77",
      selectorMatches: {
        "[data-testid='export-table']": 0
      },
      screenshotBase64: screenshotSvg("Checkpoint stable", "Step 3 waited 500ms", "The expected export control still is not present."),
      generatedCode: "POST /v2/scrape with actions[0..2]",
      raw: {
        success: true,
        data: {
          metadata: {
            url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
            title: "A Light in the Attic | Books to Scrape - Sandbox",
            scrapeId: "scrape_recorded_demo"
          }
        }
      }
    },
    {
      index: 3,
      action: example.actions[3],
      status: "failed",
      durationMs: 6774,
      url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      title: "A Light in the Attic | Books to Scrape - Sandbox",
      textExcerpt: "A Light in the Attic\n\nProduct Information\nUPC: a897fe39b1053632\nProduct Type: Books\nPrice excluding tax: GBP51.77",
      selectorMatches: {
        "[data-testid='export-table']": 0
      },
      screenshotBase64: screenshotSvg("Failure point", "Step 4 tried [data-testid='export-table']", "No matching element appears in the parsed HTML."),
      generatedCode: "POST /v2/scrape with actions[0..3]",
      error: "Firecrawl could not click selector [data-testid='export-table'].",
      raw: {
        success: false,
        error: "Firecrawl could not click selector [data-testid='export-table']."
      }
    }
  ]
};

function screenshotSvg(title: string, detail: string, note: string) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
  <rect width="960" height="600" fill="#080808"/>
  <rect x="36" y="34" width="888" height="532" rx="0" fill="#101010" stroke="#2b2b2b"/>
  <rect x="66" y="68" width="828" height="58" fill="#151515" stroke="#333"/>
  <text x="92" y="105" fill="#f4f4f4" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(title)}</text>
  <rect x="66" y="154" width="248" height="330" fill="#f5f5f0" stroke="#d7d7d0"/>
  <rect x="100" y="190" width="180" height="214" fill="#d1491f"/>
  <text x="126" y="294" fill="#fff8ee" font-family="Georgia, serif" font-size="24" font-weight="700">Books</text>
  <text x="123" y="326" fill="#fff8ee" font-family="Georgia, serif" font-size="18">to Scrape</text>
  <text x="352" y="198" fill="#f4f4f4" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700">A Light in the Attic</text>
  <text x="352" y="248" fill="#b0b0b0" font-family="Inter, Arial, sans-serif" font-size="22">${escapeXml(detail)}</text>
  <text x="352" y="296" fill="#8a8a8a" font-family="Inter, Arial, sans-serif" font-size="18">${escapeXml(note)}</text>
  <rect x="352" y="350" width="406" height="54" fill="#151515" stroke="#3a3a3a"/>
  <text x="378" y="384" fill="#ff4d00" font-family="Menlo, Consolas, monospace" font-size="18">[data-testid='export-table'] matches: 0</text>
</svg>`.trim();

  return encodeBase64(svg);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodeBase64(value: string) {
  if (typeof btoa === "function") return btoa(value);
  return Buffer.from(value).toString("base64");
}

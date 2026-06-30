import type { TraceRequestInput } from "@/lib/trace-schema";

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";

type FirecrawlResponse = {
  success?: boolean;
  data?: Record<string, unknown>;
  error?: unknown;
  message?: string;
  [key: string]: unknown;
};

export class FirecrawlTraceClient {
  constructor(private readonly apiKey = process.env.FIRECRAWL_API_KEY) {}

  hasApiKey() {
    return Boolean(this.apiKey);
  }

  async scrapeWithActions(request: TraceRequestInput, actions: Array<Record<string, unknown>>) {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY is required for live mode.");

    const body = {
      url: request.url,
      formats: ["markdown", "html", "screenshot"],
      actions,
      onlyMainContent: request.firecrawl.onlyMainContent,
      waitFor: request.firecrawl.waitFor,
      timeout: request.firecrawl.timeout,
      mobile: request.firecrawl.mobile,
      proxy: request.firecrawl.proxy,
      storeInCache: false,
      ...(request.firecrawl.location ? { location: request.firecrawl.location } : {}),
      ...(request.firecrawl.profile?.name ? { profile: request.firecrawl.profile } : {})
    };

    return this.fetchJson("/scrape", {
      method: "POST",
      body: JSON.stringify(body),
      timeoutMs: request.firecrawl.timeout
    });
  }

  private async fetchJson(path: string, init: RequestInit & { timeoutMs: number }) {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY is required for live mode.");

    const controller = new AbortController();
    const timeoutMs = init.timeoutMs + 5000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...(init.headers ?? {})
        },
        signal: controller.signal
      });
      const text = await response.text();
      const json = parseMaybeJson(text);
      if (!response.ok) {
        const message = (json?.message ?? json?.error ?? text) || `HTTP ${response.status}`;
        throw new Error(typeof message === "string" ? message : JSON.stringify(message));
      }
      return (json ?? {}) as FirecrawlResponse;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Client timeout after ${timeoutMs}ms waiting for Firecrawl response.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseMaybeJson(value: string) {
  if (!value) return null;
  try {
    return JSON.parse(value) as FirecrawlResponse;
  } catch {
    return null;
  }
}

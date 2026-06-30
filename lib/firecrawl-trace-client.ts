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

  async scrapeWithActions(
    request: TraceRequestInput,
    actions: Array<Record<string, unknown>>,
    signal?: AbortSignal,
  ) {
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
      timeoutMs: request.firecrawl.timeout,
      signal
    });
  }

  private async fetchJson(path: string, init: RequestInit & { timeoutMs: number }) {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY is required for live mode.");

    const { timeoutMs: requestTimeoutMs, signal, ...requestInit } = init;
    const controller = new AbortController();
    const timeoutMs = requestTimeoutMs + 5000;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const abortFromUpstream = () => controller.abort();

    if (signal?.aborted) {
      controller.abort();
    } else {
      signal?.addEventListener("abort", abortFromUpstream, { once: true });
    }

    try {
      const response = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
        ...requestInit,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...(requestInit.headers ?? {})
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
      if (error instanceof Error && error.name === "AbortError" && timedOut) {
        throw new Error(`Client timeout after ${timeoutMs}ms waiting for Firecrawl response.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromUpstream);
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

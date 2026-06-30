import type { FirecrawlOptions, TraceRequestInput } from "@/lib/trace-schema";

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

  async createBrowserContext(request: TraceRequestInput) {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY is required for live mode.");

    const body = {
      url: request.url,
      formats: ["markdown"],
      onlyMainContent: request.firecrawl.onlyMainContent,
      waitFor: request.firecrawl.waitFor,
      timeout: request.firecrawl.timeout,
      mobile: request.firecrawl.mobile,
      proxy: request.firecrawl.proxy,
      storeInCache: false,
      ...(request.firecrawl.location ? { location: request.firecrawl.location } : {}),
      ...(request.firecrawl.profile?.name ? { profile: request.firecrawl.profile } : {})
    };

    const json = await this.fetchJson("/scrape", {
      method: "POST",
      body: JSON.stringify(body),
      timeoutMs: request.firecrawl.timeout
    });

    const metadata = json.data?.metadata;
    const scrapeId =
      typeof metadata === "object" && metadata && "scrapeId" in metadata
        ? String((metadata as { scrapeId?: unknown }).scrapeId)
        : undefined;

    if (!scrapeId) {
      throw new Error("Firecrawl setup response did not include data.metadata.scrapeId.");
    }

    return {
      scrapeId,
      raw: json,
      markdown: typeof json.data?.markdown === "string" ? json.data.markdown : undefined
    };
  }

  async interact(scrapeId: string, code: string, options: FirecrawlOptions) {
    const json = await this.fetchJson(`/scrape/${encodeURIComponent(scrapeId)}/interact`, {
      method: "POST",
      body: JSON.stringify({
        code,
        timeout: Math.ceil(options.timeout / 1000),
        origin: "action-trace-workbench"
      }),
      timeoutMs: options.timeout
    });

    return json;
  }

  async stop(scrapeId: string) {
    return this.fetchJson(`/scrape/${encodeURIComponent(scrapeId)}/interact`, {
      method: "DELETE",
      timeoutMs: 15000
    });
  }

  private async fetchJson(path: string, init: RequestInit & { timeoutMs: number }) {
    if (!this.apiKey) throw new Error("FIRECRAWL_API_KEY is required for live mode.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs);
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

export function parseInteractSnapshot(raw: FirecrawlResponse) {
  const candidates = [
    raw.data?.result,
    raw.data?.stdout,
    raw.data?.output,
    raw.result,
    raw.stdout,
    raw.output
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const parsed = parseSnapshotString(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function parseSnapshotString(value: string) {
  const direct = parseJsonObject(value);
  if (direct) return direct;

  const lines = value.split(/\r?\n/).reverse();
  for (const line of lines) {
    const parsed = parseJsonObject(line);
    if (parsed && "__actionTraceSnapshot" in parsed) {
      return parsed.__actionTraceSnapshot as Record<string, unknown>;
    }
    if (parsed?.ok != null) return parsed;
  }

  const marker = value.match(/\{"__actionTraceSnapshot":(\{[\s\S]*\})\}/);
  if (marker?.[1]) return parseJsonObject(marker[1]);
  return null;
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

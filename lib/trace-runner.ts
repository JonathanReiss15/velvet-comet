import * as cheerio from "cheerio";
import {
  buildDiagnosis,
  classifyStepFailure,
  evaluateChecks,
} from "@/lib/trace-analyzer";
import { defaultFirecrawlOptions } from "@/lib/examples";
import { FirecrawlTraceClient } from "@/lib/firecrawl-trace-client";
import type { TraceStreamEvent } from "@/lib/trace-events";
import {
  normalizeActions,
  TraceReportSchema,
  UnsupportedActionError,
  type FirecrawlAction,
  type TraceReport,
  type TraceRequestInput,
  type TraceStep,
} from "@/lib/trace-schema";

type EmitTraceEvent = (event: TraceStreamEvent) => void | Promise<void>;
type RunTraceOptions = {
  signal?: AbortSignal;
};

export async function runTrace(input: TraceRequestInput): Promise<TraceReport> {
  return runTraceWithEvents(input);
}

export async function runTraceWithEvents(
  input: TraceRequestInput,
  onEvent?: EmitTraceEvent,
  options: RunTraceOptions = {},
): Promise<TraceReport> {
  const id = `trace_${Date.now().toString(36)}`;
  const firecrawl = { ...defaultFirecrawlOptions, ...input.firecrawl };

  let actions: FirecrawlAction[];
  try {
    actions = normalizeActions(input.actions);
  } catch (error) {
    if (error instanceof UnsupportedActionError) {
      const report = unsupportedActionReport({
        id,
        input: { ...input, firecrawl },
        index: error.index,
        message: error.message,
      });
      await emitTraceEvent(onEvent, { type: "trace.completed", report });
      return report;
    }
    throw error;
  }

  return runLiveTrace({ ...input, firecrawl }, actions, id, onEvent, options);
}

async function runLiveTrace(
  input: TraceRequestInput,
  actions: FirecrawlAction[],
  id: string,
  onEvent?: EmitTraceEvent,
  options: RunTraceOptions = {},
): Promise<TraceReport> {
  const client = new FirecrawlTraceClient();
  const createdAt = new Date().toISOString();
  const startedAt = Date.now();
  const steps: TraceStep[] = [];
  const warnings = actions.flatMap((action, index) =>
    actionWarnings(action).map((warning) => `Step ${index + 1}: ${warning}`),
  );
  let scrapeId: string | undefined;
  let diagnosis: TraceReport["diagnosis"] = null;
  let failedStepIndex: number | null = null;
  let firecrawlCalls = 0;

  await emitTraceEvent(onEvent, {
    type: "trace.started",
    report: pendingTraceReport({ id, input, actions, createdAt, warnings }),
  });

  try {
    for (let index = 0; index < actions.length; index += 1) {
      throwIfAborted(options.signal);
      const action = actions[index];
      const startedAt = Date.now();
      let raw: unknown;
      let step: TraceStep;

      await emitTraceEvent(onEvent, {
        type: "step.started",
        step: {
          index,
          action,
          status: "pending",
          durationMs: 0,
        },
      });

      try {
        raw = await client.scrapeWithActions(
          input,
          actions.slice(0, index + 1),
          options.signal,
        );
        firecrawlCalls += 1;
        step = scrapeResponseToStep({
          index,
          action,
          selectorsToCheck: selectorsForChecks(input.checks),
          generatedCode: `POST /v2/scrape with actions[0..${index}]`,
          raw,
          durationMs: Date.now() - startedAt,
        });
        scrapeId = scrapeId ?? extractScrapeId(raw);
      } catch (error) {
        if (isAbortError(error) || options.signal?.aborted) throw error;
        firecrawlCalls += 1;
        const message = error instanceof Error ? error.message : String(error);
        const previousStep = steps[steps.length - 1];
        step = {
          index,
          action,
          status: "failed",
          durationMs: Date.now() - startedAt,
          url: previousStep?.url,
          title: previousStep?.title,
          textExcerpt: previousStep?.textExcerpt,
          selectorMatches: previousStep?.selectorMatches,
          screenshotBase64: previousStep?.screenshotBase64,
          generatedCode: `POST /v2/scrape with actions[0..${index}]`,
          error: message,
          raw: { error: message },
        };
      }

      if (step.status === "failed") {
        failedStepIndex = index;
        diagnosis = buildDiagnosis(classifyStepFailure(action, step), {
          step,
          action,
        });
        steps.push(step);
        await emitTraceEvent(onEvent, {
          type: "step.failed",
          step,
          diagnosis,
          failedStepIndex,
          summary: traceSummary(actions, steps, firecrawlCalls),
        });
        const skippedStart = steps.length;
        appendSkippedSteps(steps, actions, index + 1);
        await emitSkippedSteps(onEvent, steps.slice(skippedStart));
        break;
      }

      const checkResult = evaluateChecks({
        checks: input.checks,
        action,
        step,
        isFinalStep: index === actions.length - 1,
      });
      if (!checkResult.ok) {
        step.status = "failed";
        step.error = checkResult.failure.message;
        failedStepIndex = index;
        diagnosis = buildDiagnosis(checkResult.failure.code, {
          step,
          action,
          checkFailure: checkResult.failure,
        });
        steps.push(step);
        await emitTraceEvent(onEvent, {
          type: "step.failed",
          step,
          diagnosis,
          failedStepIndex,
          summary: traceSummary(actions, steps, firecrawlCalls),
        });
        const skippedStart = steps.length;
        appendSkippedSteps(steps, actions, index + 1);
        await emitSkippedSteps(onEvent, steps.slice(skippedStart));
        break;
      }

      steps.push(step);
      await emitTraceEvent(onEvent, {
        type: "step.completed",
        step,
        summary: traceSummary(actions, steps, firecrawlCalls),
      });
    }
  } catch (error) {
    if (isAbortError(error) || options.signal?.aborted) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (steps.length === 0) {
      const report = firecrawlErrorReport({
        id,
        input,
        createdAt,
        scrapeId,
        firecrawlCalls,
        message,
      });
      await emitTraceEvent(onEvent, { type: "trace.completed", report });
      return report;
    }
    const index = steps.length;
    const step: TraceStep = {
      index,
      action: actions[index] ?? { type: "unknown" },
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: message,
      raw: { error: message },
    };
    failedStepIndex = index;
    diagnosis = buildDiagnosis("FIRECRAWL_ERROR", {
      step,
      action: actions[index],
    });
    steps.push(step);
    await emitTraceEvent(onEvent, {
      type: "step.failed",
      step,
      diagnosis,
      failedStepIndex,
      summary: traceSummary(actions, steps, firecrawlCalls),
    });
    const skippedStart = steps.length;
    appendSkippedSteps(steps, actions, index + 1);
    await emitSkippedSteps(onEvent, steps.slice(skippedStart));
  }

  if (!diagnosis && steps.length === actions.length) {
    const lastStep = steps[steps.length - 1];
    if (lastStep && (lastStep.textExcerpt ?? "").trim().length < 40) {
      failedStepIndex = lastStep.index;
      lastStep.status = "failed";
      diagnosis = buildDiagnosis("EMPTY_EXTRACTION", {
        step: lastStep,
        action: actions[lastStep.index],
        extraEvidence: [
          `Final text excerpt length: ${(lastStep.textExcerpt ?? "").trim().length}`,
        ],
      });
      await emitTraceEvent(onEvent, {
        type: "step.failed",
        step: lastStep,
        diagnosis,
        failedStepIndex,
        summary: traceSummary(actions, steps, firecrawlCalls),
      });
    }
  }

  const completedAt = new Date().toISOString();
  const report: TraceReport = {
    id,
    status: diagnosis ? "failed" : "passed",
    mode: "live",
    url: input.url,
    createdAt,
    completedAt,
    durationMs: Date.now() - startedAt,
    scrapeId,
    failedStepIndex,
    summary: traceSummary(actions, steps, firecrawlCalls),
    diagnosis,
    warnings,
    actions: input.actions,
    checks: input.checks,
    firecrawl: input.firecrawl,
    steps,
  };

  const parsedReport = TraceReportSchema.parse(report);
  await emitTraceEvent(onEvent, {
    type: "trace.completed",
    report: parsedReport,
  });
  return parsedReport;
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (!signal?.aborted) return;
  throw new DOMException("Trace request was aborted.", "AbortError");
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

async function emitTraceEvent(
  onEvent: EmitTraceEvent | undefined,
  event: TraceStreamEvent,
) {
  if (onEvent) await onEvent(event);
}

async function emitSkippedSteps(
  onEvent: EmitTraceEvent | undefined,
  steps: TraceStep[],
) {
  if (steps.length === 0) return;
  await emitTraceEvent(onEvent, { type: "steps.skipped", steps });
}

function pendingTraceReport(params: {
  id: string;
  input: TraceRequestInput;
  actions: FirecrawlAction[];
  createdAt: string;
  warnings: string[];
}): TraceReport {
  return {
    id: params.id,
    status: "partial",
    mode: "live",
    url: params.input.url,
    createdAt: params.createdAt,
    durationMs: 0,
    failedStepIndex: null,
    summary: {
      stepsPlanned: params.actions.length,
      stepsCompleted: 0,
      firecrawlCalls: 0,
      screenshotsCaptured: 0,
    },
    diagnosis: null,
    warnings: params.warnings,
    actions: params.input.actions,
    checks: params.input.checks,
    firecrawl: params.input.firecrawl,
    steps: params.actions.map((action, index) => ({
      index,
      action,
      status: "pending",
      durationMs: 0,
    })),
  };
}

function traceSummary(
  actions: FirecrawlAction[],
  steps: TraceStep[],
  firecrawlCalls: number,
): TraceReport["summary"] {
  return {
    stepsPlanned: actions.length,
    stepsCompleted: steps.filter((step) => step.status === "passed").length,
    firecrawlCalls,
    screenshotsCaptured: steps.filter((step) =>
      Boolean(step.screenshotBase64),
    ).length,
  };
}

function extractRawError(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  for (const key of ["error", "stderr", "message"]) {
    if (typeof record[key] === "string" && record[key])
      return record[key] as string;
  }
  return null;
}

function scrapeResponseToStep(params: {
  index: number;
  action: FirecrawlAction;
  selectorsToCheck: string[];
  generatedCode: string;
  raw: unknown;
  durationMs: number;
}): TraceStep {
  const raw =
    params.raw && typeof params.raw === "object"
      ? (params.raw as Record<string, unknown>)
      : {};
  const data =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : {};
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {};
  const success = raw.success !== false;
  const markdown = typeof data.markdown === "string" ? data.markdown : "";
  const html = typeof data.html === "string" ? data.html : "";
  const screenshot = extractScreenshotSource(data.screenshot);
  const error = extractRawError(raw);
  const selectorMatches = countSelectorMatches(html, params.selectorsToCheck);
  const selectorText = extractSelectorText(html, params.selectorsToCheck);

  return {
    index: params.index,
    action: params.action,
    status: success ? "passed" : "failed",
    durationMs: Math.max(0, Math.round(params.durationMs)),
    url: typeof metadata.url === "string" ? metadata.url : undefined,
    title:
      typeof metadata.title === "string" ? metadata.title.trim() : undefined,
    textExcerpt: markdown.slice(0, 1200),
    selectorMatches,
    selectorText,
    screenshotBase64: screenshot,
    generatedCode: params.generatedCode,
    error: success ? undefined : (error ?? "Firecrawl scrape prefix failed."),
    raw: compactRawResponse(raw),
  };
}

function compactRawResponse(raw: Record<string, unknown>) {
  const data =
    raw.data && typeof raw.data === "object"
      ? { ...(raw.data as Record<string, unknown>) }
      : undefined;
  if (data) {
    if (typeof data.html === "string")
      data.html = `[${data.html.length} html chars captured for selector checks]`;
    if (typeof data.screenshot === "string")
      data.screenshot = `[${data.screenshot.length} screenshot chars captured separately]`;
    if (typeof data.markdown === "string" && data.markdown.length > 1200) {
      data.markdown = `${data.markdown.slice(0, 1200)}...`;
    }
  }
  return data ? { ...raw, data } : raw;
}

function selectorsForChecks(checks: TraceRequestInput["checks"]) {
  return Array.from(
    new Set(
      checks.flatMap((check) =>
        check.type === "selector_exists" ||
        check.type === "selector_text_contains"
          ? [check.selector]
          : [],
      ),
    ),
  );
}

function actionWarnings(action: FirecrawlAction) {
  if (action.type === "write") {
    return [
      "write action uses the current focused element; add a click/focus action before it when tracing typed input.",
    ];
  }
  return [];
}

function countSelectorMatches(html: string, selectors: string[]) {
  if (!html || selectors.length === 0) return undefined;
  const $ = cheerio.load(html);
  const matches: Record<string, number> = {};
  for (const selector of selectors) {
    try {
      matches[selector] = $(selector).length;
    } catch {
      matches[selector] = 0;
    }
  }
  return matches;
}

function extractSelectorText(html: string, selectors: string[]) {
  if (!html || selectors.length === 0) return undefined;
  const $ = cheerio.load(html);
  const textBySelector: Record<string, string> = {};
  for (const selector of selectors) {
    try {
      textBySelector[selector] = $(selector)
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200);
    } catch {
      textBySelector[selector] = "";
    }
  }
  return textBySelector;
}

function extractScrapeId(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : {};
  const metadata =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : {};
  return typeof metadata.scrapeId === "string" ? metadata.scrapeId : undefined;
}

function extractScreenshotSource(value: unknown) {
  if (typeof value === "string") return normalizeScreenshotSource(value);
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  for (const key of ["url", "src", "data", "base64", "image", "screenshot"]) {
    if (typeof record[key] === "string") {
      return normalizeScreenshotSource(record[key] as string);
    }
  }

  return undefined;
}

function normalizeScreenshotSource(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function appendSkippedSteps(
  steps: TraceStep[],
  actions: FirecrawlAction[],
  startIndex: number,
) {
  for (let index = startIndex; index < actions.length; index += 1) {
    steps.push({
      index,
      action: actions[index],
      status: "skipped",
      durationMs: 0,
      error: "Skipped after first failure.",
    });
  }
}

function unsupportedActionReport(params: {
  id: string;
  input: TraceRequestInput;
  index: number;
  message: string;
}): TraceReport {
  const createdAt = new Date().toISOString();
  const step: TraceStep = {
    index: params.index,
    action: params.input.actions[params.index] ?? {},
    status: "failed",
    durationMs: 0,
    error: params.message,
    raw: { validation: true },
  };
  return {
    id: params.id,
    status: "invalid",
    mode: "live",
    url: params.input.url,
    createdAt,
    completedAt: createdAt,
    durationMs: 0,
    failedStepIndex: params.index,
    summary: {
      stepsPlanned: params.input.actions.length,
      stepsCompleted: 0,
      firecrawlCalls: 0,
      screenshotsCaptured: 0,
    },
    diagnosis: buildDiagnosis("UNSUPPORTED_ACTION", {
      step,
      action: params.input.actions[params.index],
      extraEvidence: [params.message],
    }),
    warnings: [],
    actions: params.input.actions,
    checks: params.input.checks,
    firecrawl: params.input.firecrawl,
    steps: [
      ...params.input.actions.slice(0, params.index).map((action, index) => ({
        index,
        action,
        status: "pending" as const,
        durationMs: 0,
      })),
      step,
      ...params.input.actions.slice(params.index + 1).map((action, offset) => ({
        index: params.index + offset + 1,
        action,
        status: "skipped" as const,
        durationMs: 0,
        error: "Skipped because request validation failed.",
      })),
    ],
  };
}

function firecrawlErrorReport(params: {
  id: string;
  input: TraceRequestInput;
  createdAt: string;
  message: string;
  scrapeId?: string;
  setupRaw?: unknown;
  firecrawlCalls?: number;
}): TraceReport {
  const step: TraceStep = {
    index: 0,
    action: params.input.actions[0] ?? {},
    status: "failed",
    durationMs: 0,
    error: params.message,
    raw: params.setupRaw,
  };
  const completedAt = new Date().toISOString();
  return {
    id: params.id,
    status: "failed",
    mode: "live",
    url: params.input.url,
    createdAt: params.createdAt,
    completedAt,
    durationMs:
      new Date(completedAt).getTime() - new Date(params.createdAt).getTime(),
    scrapeId: params.scrapeId,
    failedStepIndex: 0,
    summary: {
      stepsPlanned: params.input.actions.length,
      stepsCompleted: 0,
      firecrawlCalls: params.firecrawlCalls ?? 0,
      screenshotsCaptured: 0,
    },
    diagnosis: buildDiagnosis("FIRECRAWL_ERROR", {
      step,
      action: params.input.actions[0],
      extraEvidence: [params.message],
    }),
    warnings: [],
    actions: params.input.actions,
    checks: params.input.checks,
    firecrawl: params.input.firecrawl,
    steps: [
      step,
      ...params.input.actions.slice(1).map((action, index) => ({
        index: index + 1,
        action,
        status: "skipped" as const,
        durationMs: 0,
        error: "Skipped because Firecrawl setup failed.",
      })),
    ],
  };
}

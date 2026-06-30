import { generateInteractCode, translateActionToPlaywright } from "@/lib/action-translator";
import { buildDiagnosis, classifyStepFailure, evaluateChecks } from "@/lib/trace-analyzer";
import {
  buildGenericFixtureReport,
  defaultFirecrawlOptions,
  getExample,
  getFixtureReport
} from "@/lib/examples";
import { FirecrawlTraceClient, parseInteractSnapshot } from "@/lib/firecrawl-trace-client";
import {
  normalizeActions,
  TraceReportSchema,
  UnsupportedActionError,
  type FirecrawlAction,
  type TraceReport,
  type TraceRequestInput,
  type TraceStep
} from "@/lib/trace-schema";

export async function runTrace(input: TraceRequestInput): Promise<TraceReport> {
  const id = input.mode === "fixture" && input.exampleId ? `fixture_${input.exampleId}` : `trace_${Date.now().toString(36)}`;
  const firecrawl = { ...defaultFirecrawlOptions, ...input.firecrawl };

  let actions: FirecrawlAction[];
  try {
    actions = normalizeActions(input.actions);
  } catch (error) {
    if (error instanceof UnsupportedActionError) {
      return unsupportedActionReport({
        id,
        input: { ...input, firecrawl },
        index: error.index,
        message: error.message
      });
    }
    throw error;
  }

  if (input.mode === "fixture") {
    const fixture = getFixtureReport(input.exampleId ?? "");
    if (fixture) return fixture;
    return buildGenericFixtureReport({
      id,
      url: input.url,
      actions: input.actions,
      checks: input.checks,
      firecrawl
    });
  }

  return runLiveTrace({ ...input, firecrawl }, actions, id);
}

async function runLiveTrace(input: TraceRequestInput, actions: FirecrawlAction[], id: string): Promise<TraceReport> {
  const client = new FirecrawlTraceClient();
  const createdAt = new Date().toISOString();
  const startedAt = Date.now();
  const steps: TraceStep[] = [];
  const warnings: string[] = [];
  let scrapeId: string | undefined;
  let setupRaw: unknown;
  let cleanupWarning: string | undefined;
  let diagnosis: TraceReport["diagnosis"] = null;
  let failedStepIndex: number | null = null;
  let firecrawlCalls = 0;
  let liveViewUrl: string | undefined;

  if (!client.hasApiKey()) {
    return firecrawlErrorReport({
      id,
      input,
      createdAt,
      message: "FIRECRAWL_API_KEY is required for live mode. Switch to fixture mode to run the demo without a key."
    });
  }

  try {
    const setup = await client.createBrowserContext(input);
    firecrawlCalls += 1;
    scrapeId = setup.scrapeId;
    setupRaw = setup.raw;

    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      const translated = translateActionToPlaywright(action);
      warnings.push(...translated.warnings.map((warning) => `Step ${index + 1}: ${warning}`));
      const generated = generateInteractCode(action, input.firecrawl.timeout);

      const raw = await client.interact(scrapeId, generated.code, input.firecrawl);
      firecrawlCalls += 1;
      liveViewUrl = liveViewUrl ?? extractLiveViewUrl(raw);
      const snapshot = parseInteractSnapshot(raw);
      const step = snapshotToStep(index, action, generated.code, snapshot, raw);

      if (step.status === "failed") {
        failedStepIndex = index;
        diagnosis = buildDiagnosis(classifyStepFailure(action, step), {
          step,
          action
        });
        steps.push(step);
        appendSkippedSteps(steps, actions, index + 1);
        break;
      }

      const checkResult = evaluateChecks({
        checks: input.checks,
        step,
        isFinalStep: index === actions.length - 1
      });
      if (!checkResult.ok) {
        step.status = "failed";
        step.error = checkResult.failure.message;
        failedStepIndex = index;
        diagnosis = buildDiagnosis(checkResult.failure.code, {
          step,
          action,
          checkFailure: checkResult.failure
        });
        steps.push(step);
        appendSkippedSteps(steps, actions, index + 1);
        break;
      }

      steps.push(step);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (steps.length === 0) {
      return firecrawlErrorReport({
        id,
        input,
        createdAt,
        scrapeId,
        setupRaw,
        firecrawlCalls,
        message
      });
    }
    const index = steps.length;
    const step: TraceStep = {
      index,
      action: actions[index] ?? { type: "unknown" },
      status: "failed",
      durationMs: Date.now() - startedAt,
      error: message,
      raw: { setupRaw }
    };
    failedStepIndex = index;
    diagnosis = buildDiagnosis("FIRECRAWL_ERROR", { step, action: actions[index] });
    steps.push(step);
    appendSkippedSteps(steps, actions, index + 1);
  } finally {
    if (scrapeId) {
      try {
        await client.stop(scrapeId);
        firecrawlCalls += 1;
      } catch (error) {
        cleanupWarning = `Cleanup failed for scrapeId ${scrapeId}: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }

  if (!diagnosis && steps.length === actions.length) {
    const lastStep = steps[steps.length - 1];
    if (lastStep && (lastStep.textExcerpt ?? "").trim().length < 40) {
      failedStepIndex = lastStep.index;
      lastStep.status = "failed";
      diagnosis = buildDiagnosis("EMPTY_EXTRACTION", {
        step: lastStep,
        action: actions[lastStep.index],
        extraEvidence: [`Final text excerpt length: ${(lastStep.textExcerpt ?? "").trim().length}`]
      });
    }
  }

  if (cleanupWarning) warnings.push(cleanupWarning);

  const completedAt = new Date().toISOString();
  const report: TraceReport = {
    id,
    status: diagnosis ? (cleanupWarning ? "partial" : "failed") : cleanupWarning ? "partial" : "passed",
    mode: "live",
    url: input.url,
    createdAt,
    completedAt,
    durationMs: Date.now() - startedAt,
    scrapeId,
    liveViewUrl,
    failedStepIndex,
    summary: {
      stepsPlanned: actions.length,
      stepsCompleted: steps.filter((step) => step.status === "passed").length,
      firecrawlCalls,
      screenshotsCaptured: steps.filter((step) => Boolean(step.screenshotBase64)).length
    },
    diagnosis,
    warnings,
    actions: input.actions,
    checks: input.checks,
    firecrawl: input.firecrawl,
    steps
  };

  return TraceReportSchema.parse(report);
}

function snapshotToStep(
  index: number,
  action: FirecrawlAction,
  generatedCode: string,
  snapshot: Record<string, unknown> | null,
  raw: unknown
): TraceStep {
  if (!snapshot) {
    const rawError = extractRawError(raw);
    return {
      index,
      action,
      status: "failed",
      durationMs: 0,
      generatedCode,
      error: rawError ?? "Interact response did not include a parseable action trace snapshot.",
      raw
    };
  }

  const ok = snapshot.ok !== false;
  return {
    index,
    action,
    status: ok ? "passed" : "failed",
    durationMs: typeof snapshot.durationMs === "number" ? Math.max(0, Math.round(snapshot.durationMs)) : 0,
    url: typeof snapshot.url === "string" ? snapshot.url : undefined,
    title: typeof snapshot.title === "string" ? snapshot.title : undefined,
    textExcerpt: typeof snapshot.textExcerpt === "string" ? snapshot.textExcerpt : undefined,
    screenshotBase64: typeof snapshot.screenshotBase64 === "string" ? snapshot.screenshotBase64 : undefined,
    generatedCode,
    error: typeof snapshot.error === "string" ? snapshot.error : undefined,
    raw
  };
}

function extractRawError(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  for (const key of ["error", "stderr", "message"]) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  return null;
}

function extractLiveViewUrl(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  return typeof record.liveViewUrl === "string" ? record.liveViewUrl : undefined;
}

function appendSkippedSteps(steps: TraceStep[], actions: FirecrawlAction[], startIndex: number) {
  for (let index = startIndex; index < actions.length; index += 1) {
    steps.push({
      index,
      action: actions[index],
      status: "skipped",
      durationMs: 0,
      error: "Skipped after first failure."
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
    raw: { validation: true }
  };
  return {
    id: params.id,
    status: "invalid",
    mode: params.input.mode,
    url: params.input.url,
    createdAt,
    completedAt: createdAt,
    durationMs: 0,
    failedStepIndex: params.index,
    summary: {
      stepsPlanned: params.input.actions.length,
      stepsCompleted: 0,
      firecrawlCalls: 0,
      screenshotsCaptured: 0
    },
    diagnosis: buildDiagnosis("UNSUPPORTED_ACTION", {
      step,
      action: params.input.actions[params.index],
      extraEvidence: [params.message]
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
        durationMs: 0
      })),
      step,
      ...params.input.actions.slice(params.index + 1).map((action, offset) => ({
        index: params.index + offset + 1,
        action,
        status: "skipped" as const,
        durationMs: 0,
        error: "Skipped because request validation failed."
      }))
    ]
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
    raw: params.setupRaw
  };
  const completedAt = new Date().toISOString();
  return {
    id: params.id,
    status: "failed",
    mode: params.input.mode,
    url: params.input.url,
    createdAt: params.createdAt,
    completedAt,
    durationMs: new Date(completedAt).getTime() - new Date(params.createdAt).getTime(),
    scrapeId: params.scrapeId,
    failedStepIndex: 0,
    summary: {
      stepsPlanned: params.input.actions.length,
      stepsCompleted: 0,
      firecrawlCalls: params.firecrawlCalls ?? 0,
      screenshotsCaptured: 0
    },
    diagnosis: buildDiagnosis("FIRECRAWL_ERROR", {
      step,
      action: params.input.actions[0],
      extraEvidence: [params.message]
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
        error: "Skipped because Firecrawl setup failed."
      }))
    ]
  };
}

export function examplePayload(exampleId: string) {
  const example = getExample(exampleId);
  if (!example) return null;
  return {
    mode: "fixture" as const,
    exampleId: example.id,
    url: example.url,
    actions: example.actions,
    checks: example.checks,
    firecrawl: defaultFirecrawlOptions
  };
}

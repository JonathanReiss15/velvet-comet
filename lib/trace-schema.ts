import { z } from "zod";

const TraceModeSchema = z.literal("live");
const TraceStatusSchema = z.enum(["passed", "failed", "partial", "invalid"]);
const StepStatusSchema = z.enum(["pending", "passed", "failed", "skipped"]);
const DiagnosisCodeSchema = z.enum([
  "SELECTOR_NOT_FOUND",
  "WAIT_TIMEOUT",
  "NAVIGATION_CHANGED",
  "EMPTY_EXTRACTION",
  "POSSIBLE_BLOCK",
  "JAVASCRIPT_ERROR",
  "UNSUPPORTED_ACTION",
  "FIRECRAWL_ERROR"
]);

const selector = z.string().min(1).max(1000);

const WaitActionSchema = z
  .object({
    type: z.literal("wait"),
    selector: selector.optional(),
    milliseconds: z.number().int().min(1).max(60000).optional()
  })
  .refine((action) => Boolean(action.selector || action.milliseconds), {
    message: "wait requires selector or milliseconds"
  });

const ClickActionSchema = z.object({
  type: z.literal("click"),
  selector
});

const WriteActionSchema = z.object({
  type: z.literal("write"),
  text: z.string().min(1).max(5000)
});

const FillActionSchema = z.object({
  type: z.literal("fill"),
  selector,
  text: z.string().min(0).max(5000)
});

const PressActionSchema = z.object({
  type: z.literal("press"),
  key: z.string().min(1).max(80)
});

const ScrollActionSchema = z.object({
  type: z.literal("scroll"),
  selector: selector.optional(),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  amount: z.number().int().min(1).max(10000).optional()
});

const ScreenshotActionSchema = z.object({
  type: z.literal("screenshot"),
  fullPage: z.boolean().optional()
});

const ExecuteJavascriptActionSchema = z
  .object({
    type: z.literal("executeJavascript"),
    code: z.string().min(1).max(8000).optional(),
    script: z.string().min(1).max(8000).optional()
  })
  .refine((action) => Boolean(action.code || action.script), {
    message: "executeJavascript requires code or script"
  });

const FirecrawlActionSchema = z.union([
  WaitActionSchema,
  ClickActionSchema,
  WriteActionSchema,
  FillActionSchema,
  PressActionSchema,
  ScrollActionSchema,
  ScreenshotActionSchema,
  ExecuteJavascriptActionSchema
]);

const CheckSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("selector_exists"),
    selector
  }),
  z.object({
    type: z.literal("selector_text_contains"),
    selector,
    text: z.string().min(1).max(1000)
  }),
  z.object({
    type: z.literal("url_matches"),
    pattern: z.string().min(1).max(1000)
  }),
  z.object({
    type: z.literal("text_contains"),
    text: z.string().min(1).max(1000)
  }),
  z.object({
    type: z.literal("min_text_length"),
    length: z.number().int().min(1).max(100000)
  })
]);

const FirecrawlOptionsSchema = z.object({
  waitFor: z.number().int().min(0).max(60000).default(500),
  timeout: z.number().int().min(1000).max(180000).default(60000),
  mobile: z.boolean().default(false),
  proxy: z.enum(["auto", "basic", "stealth"]).default("auto"),
  onlyMainContent: z.boolean().default(true),
  location: z
    .object({
      country: z.string().min(2).max(2).optional()
    })
    .optional(),
  profile: z
    .object({
      name: z.string().min(1).max(100).optional()
    })
    .optional()
});

export const TraceRequestInputSchema = z.object({
  mode: TraceModeSchema.default("live"),
  exampleId: z.string().max(120).optional(),
  url: z.string().url(),
  actions: z.array(z.record(z.unknown())).min(1).max(20),
  checks: z.array(CheckSchema).max(10).default([]),
  firecrawl: FirecrawlOptionsSchema.default({})
});

const DiagnosisSchema = z.object({
  code: DiagnosisCodeSchema,
  message: z.string(),
  evidence: z.array(z.string()),
  suggestedFix: z.string(),
  relatedOptions: z.array(z.string()).default([])
});

const TraceStepSchema = z.object({
  index: z.number().int().min(0),
  action: z.record(z.unknown()),
  status: StepStatusSchema,
  durationMs: z.number().int().min(0),
  url: z.string().optional(),
  title: z.string().optional(),
  textExcerpt: z.string().optional(),
  selectorMatches: z.record(z.number().int().min(0)).optional(),
  selectorText: z.record(z.string()).optional(),
  screenshotBase64: z.string().optional(),
  generatedCode: z.string().optional(),
  error: z.string().optional(),
  raw: z.unknown().optional()
});

export const TraceReportSchema = z.object({
  id: z.string(),
  status: TraceStatusSchema,
  mode: TraceModeSchema,
  url: z.string(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  durationMs: z.number().int().min(0),
  scrapeId: z.string().optional(),
  liveViewUrl: z.string().optional(),
  failedStepIndex: z.number().int().min(0).nullable(),
  summary: z.object({
    stepsPlanned: z.number().int().min(0),
    stepsCompleted: z.number().int().min(0),
    firecrawlCalls: z.number().int().min(0),
    screenshotsCaptured: z.number().int().min(0)
  }),
  diagnosis: DiagnosisSchema.nullable(),
  warnings: z.array(z.string()).default([]),
  actions: z.array(z.record(z.unknown())),
  checks: z.array(CheckSchema),
  firecrawl: FirecrawlOptionsSchema,
  steps: z.array(TraceStepSchema)
});

export type DiagnosisCode = z.infer<typeof DiagnosisCodeSchema>;
export type FirecrawlAction = z.infer<typeof FirecrawlActionSchema>;
export type TraceCheck = z.infer<typeof CheckSchema>;
export type FirecrawlOptions = z.infer<typeof FirecrawlOptionsSchema>;
export type TraceRequestInput = z.infer<typeof TraceRequestInputSchema>;
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type TraceStep = z.infer<typeof TraceStepSchema>;
export type TraceReport = z.infer<typeof TraceReportSchema>;

export function normalizeActions(actions: Array<Record<string, unknown>>) {
  return actions.map((action, index) => {
    const parsed = FirecrawlActionSchema.safeParse(action);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((issue) => issue.message).join("; ");
      throw new UnsupportedActionError(index, detail || "unsupported action shape");
    }
    return parsed.data;
  });
}

export class UnsupportedActionError extends Error {
  constructor(
    public readonly index: number,
    detail: string
  ) {
    super(`Step ${index + 1} uses an unsupported action shape: ${detail}`);
    this.name = "UnsupportedActionError";
  }
}

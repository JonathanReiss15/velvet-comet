import type { Diagnosis, DiagnosisCode, FirecrawlAction, TraceCheck, TraceStep } from "@/lib/trace-schema";

type CheckFailure = {
  code: DiagnosisCode;
  message: string;
  evidence: string[];
};

const blockSignals = [
  "captcha",
  "access denied",
  "forbidden",
  "bot check",
  "blocked",
  "login required",
  "verify you are human",
  "unusual traffic"
];

export function buildDiagnosis(code: DiagnosisCode, context: {
  step?: TraceStep;
  action?: FirecrawlAction | Record<string, unknown>;
  checkFailure?: CheckFailure;
  extraEvidence?: string[];
}): Diagnosis {
  const action = context.action;
  const step = context.step;
  const evidence = [
    ...(context.checkFailure?.evidence ?? []),
    ...(step?.url ? [`Checkpoint URL: ${step.url}`] : []),
    ...(step?.title ? [`Checkpoint title: ${step.title}`] : []),
    ...(step?.error ? [`Raw error: ${step.error}`] : []),
    ...(context.extraEvidence ?? [])
  ].filter(Boolean);

  if (code === "SELECTOR_NOT_FOUND") {
    const selector = getSelector(action) ?? "the requested selector";
    return {
      code,
      message: `Step ${(step?.index ?? 0) + 1} could not find ${selector}.`,
      evidence,
      suggestedFix: "Update the selector or add a wait for the UI state that creates the target element.",
      relatedOptions: ["waitFor", "timeout", "onlyMainContent"]
    };
  }

  if (code === "WAIT_TIMEOUT") {
    const selector = getSelector(action) ? ` for ${getSelector(action)}` : "";
    return {
      code,
      message: `Step ${(step?.index ?? 0) + 1} timed out while waiting${selector}.`,
      evidence,
      suggestedFix: "Use a readiness condition that actually appears on the page, or increase the timeout if the page is genuinely slow.",
      relatedOptions: ["waitFor", "timeout", "mobile"]
    };
  }

  if (code === "NAVIGATION_CHANGED") {
    return {
      code,
      message: context.checkFailure?.message ?? `Step ${(step?.index ?? 0) + 1} changed the browser URL unexpectedly.`,
      evidence,
      suggestedFix: "Add an explicit URL assertion after navigation-capable steps or use a narrower selector that does not leave the intended page.",
      relatedOptions: ["waitFor", "profile.name"]
    };
  }

  if (code === "EMPTY_EXTRACTION") {
    return {
      code,
      message: "The workflow completed, but the captured page text was empty or too short.",
      evidence,
      suggestedFix: "Capture after a later readiness signal, disable main-content filtering, or add a wait after the step that loads the content.",
      relatedOptions: ["onlyMainContent", "waitFor", "timeout"]
    };
  }

  if (code === "POSSIBLE_BLOCK") {
    return {
      code,
      message: "The checkpoint content looks like a block, login wall, or challenge page.",
      evidence,
      suggestedFix: "Try proxy auto mode, a different location, a persistent profile, or inspect the live browser session before changing selectors.",
      relatedOptions: ["proxy", "location.country", "profile.name", "mobile"]
    };
  }

  if (code === "JAVASCRIPT_ERROR") {
    return {
      code,
      message: `Step ${(step?.index ?? 0) + 1} threw while running translated JavaScript.`,
      evidence,
      suggestedFix: "Make the JavaScript action idempotent, guard selectors before reading them, and return serializable values only.",
      relatedOptions: ["timeout"]
    };
  }

  if (code === "UNSUPPORTED_ACTION") {
    return {
      code,
      message: `Step ${(step?.index ?? 0) + 1} uses an action shape this trace runner does not support yet.`,
      evidence,
      suggestedFix: "Use wait, click, write, fill, press, scroll, screenshot, or executeJavascript for the demo trace path.",
      relatedOptions: []
    };
  }

  return {
    code: "FIRECRAWL_ERROR",
    message: "Firecrawl returned an upstream error before the trace runner could narrow it further.",
    evidence,
    suggestedFix: "Retry once, then inspect the raw response and consider proxy, timeout, or location changes if the page is protected or slow.",
    relatedOptions: ["proxy", "timeout", "location.country", "mobile"]
  };
}

export function classifyStepFailure(action: FirecrawlAction, step: TraceStep): DiagnosisCode {
  const error = `${step.error ?? ""} ${step.textExcerpt ?? ""}`.toLowerCase();

  if (hasBlockSignal(step.textExcerpt) || hasBlockSignal(step.error)) return "POSSIBLE_BLOCK";
  if (error.includes("await is only valid") || error.includes("illegal return statement") || error.includes("repl:")) {
    return "FIRECRAWL_ERROR";
  }
  if (
    action.type === "executeJavascript" ||
    error.includes("javascript") ||
    error.includes("syntaxerror") ||
    error.includes("page.evaluate")
  ) {
    return "JAVASCRIPT_ERROR";
  }
  if (action.type === "wait" && (error.includes("timeout") || error.includes("waiting"))) return "WAIT_TIMEOUT";
  if (error.includes("selector") || error.includes("strict mode") || error.includes("locator") || error.includes("element")) {
    return action.type === "wait" ? "WAIT_TIMEOUT" : "SELECTOR_NOT_FOUND";
  }
  if (error.includes("timeout")) return "WAIT_TIMEOUT";
  return "FIRECRAWL_ERROR";
}

export function evaluateChecks(params: {
  checks: TraceCheck[];
  action: FirecrawlAction;
  step: TraceStep;
  isFinalStep: boolean;
}) {
  for (const check of params.checks) {
    if (check.type === "url_matches") {
      const url = params.step.url ?? "";
      let matched = false;
      try {
        matched = new RegExp(check.pattern).test(url);
      } catch {
        return {
          ok: false,
          failure: {
            code: "NAVIGATION_CHANGED" as DiagnosisCode,
            message: `The url_matches pattern is invalid: ${check.pattern}`,
            evidence: [`Pattern did not compile: ${check.pattern}`]
          }
        };
      }
      if (!matched) {
        return {
          ok: false,
          failure: {
            code: "NAVIGATION_CHANGED" as DiagnosisCode,
            message: `URL ${url || "(unknown)"} did not match ${check.pattern}.`,
            evidence: [`Expected URL pattern: ${check.pattern}`, `Actual URL: ${url || "(unknown)"}`]
          }
        };
      }
      continue;
    }

    if (!params.isFinalStep) continue;

    const text = params.step.textExcerpt ?? "";
    if (check.type === "selector_exists") {
      const matchCount = params.step.selectorMatches?.[check.selector];
      if (matchCount && matchCount > 0) continue;

      return {
        ok: false,
        failure: {
          code:
            params.action.type === "wait" && params.action.selector === check.selector
              ? ("WAIT_TIMEOUT" as DiagnosisCode)
              : ("SELECTOR_NOT_FOUND" as DiagnosisCode),
          message: `The live checkpoint could not verify selector ${check.selector}.`,
          evidence: [
            `Expected selector: ${check.selector}`,
            matchCount == null
              ? "Firecrawl did not return HTML for this checkpoint, so the selector could not be evaluated."
              : `Parsed HTML match count: ${matchCount}`
          ]
        }
      };
    }
    if (check.type === "selector_text_contains") {
      const matchCount = params.step.selectorMatches?.[check.selector];
      const selectedText = params.step.selectorText?.[check.selector] ?? "";
      if (!matchCount || matchCount <= 0) {
        return {
          ok: false,
          failure: {
            code: "SELECTOR_NOT_FOUND" as DiagnosisCode,
            message: `The live checkpoint could not verify selector ${check.selector}.`,
            evidence: [
              `Expected selector: ${check.selector}`,
              matchCount == null
                ? "Firecrawl did not return HTML for this checkpoint, so the selector could not be evaluated."
                : `Parsed HTML match count: ${matchCount}`
            ]
          }
        };
      }

      if (!selectedText.includes(check.text)) {
        return {
          ok: false,
          failure: {
            code: hasBlockSignal(selectedText || text)
              ? ("POSSIBLE_BLOCK" as DiagnosisCode)
              : ("EMPTY_EXTRACTION" as DiagnosisCode),
            message: `The DOM text for ${check.selector} did not include "${check.text}".`,
            evidence: [
              `Expected selector: ${check.selector}`,
              `Expected text: ${check.text}`,
              `Selected DOM text length: ${selectedText.length}`
            ]
          }
        };
      }
    }
    if (check.type === "text_contains" && !text.includes(check.text)) {
      return {
        ok: false,
        failure: {
          code: hasBlockSignal(text) ? ("POSSIBLE_BLOCK" as DiagnosisCode) : ("EMPTY_EXTRACTION" as DiagnosisCode),
          message: `The checkpoint text did not include "${check.text}".`,
          evidence: [`Expected text: ${check.text}`, `Text excerpt length: ${text.length}`]
        }
      };
    }
    if (check.type === "min_text_length" && text.trim().length < check.length) {
      return {
        ok: false,
        failure: {
          code: hasBlockSignal(text) ? ("POSSIBLE_BLOCK" as DiagnosisCode) : ("EMPTY_EXTRACTION" as DiagnosisCode),
          message: `The checkpoint text was shorter than ${check.length} characters.`,
          evidence: [`Text excerpt length: ${text.trim().length}`]
        }
      };
    }
  }

  return { ok: true as const };
}

function hasBlockSignal(value: string | undefined) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return blockSignals.some((signal) => lower.includes(signal));
}

function getSelector(action: FirecrawlAction | Record<string, unknown> | undefined) {
  if (!action || !("selector" in action)) return null;
  return typeof action.selector === "string" ? action.selector : null;
}

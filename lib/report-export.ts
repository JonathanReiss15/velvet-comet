import { formatDuration, summarizeAction } from "@/lib/utils";
import type { TraceReport } from "@/lib/trace-schema";

export function traceToMarkdown(report: TraceReport, options: { redacted?: boolean } = {}) {
  const exportReport = options.redacted ? redactTraceReport(report) : report;
  const failedStep =
    exportReport.failedStepIndex == null ? "None" : `Step ${exportReport.failedStepIndex + 1}`;
  const diagnosis = exportReport.diagnosis
    ? `${exportReport.diagnosis.code}: ${exportReport.diagnosis.message}`
    : "No failure detected";

  const lines = [
    `# Action Trace Report`,
    ``,
    `- Trace ID: ${exportReport.id}`,
    `- Mode: ${exportReport.mode}`,
    `- Status: ${exportReport.status}`,
    `- URL: ${exportReport.url}`,
    `- Failed step: ${failedStep}`,
    `- Duration: ${formatDuration(exportReport.durationMs)}`,
    `- Firecrawl calls: ${exportReport.summary.firecrawlCalls}`,
    `- Screenshots: ${options.redacted ? "redacted" : exportReport.summary.screenshotsCaptured}`,
    `- Diagnosis: ${diagnosis}`,
    ``,
    `## Suggested Fix`,
    ``,
    exportReport.diagnosis?.suggestedFix ?? "No fix needed.",
    ``,
    `## Evidence`,
    ``,
    ...(exportReport.diagnosis?.evidence.length
      ? exportReport.diagnosis.evidence.map((item) => `- ${item}`)
      : ["- No failure evidence captured."]),
    ``,
    `## Timeline`,
    ``,
    `| Step | Status | Duration | Action | URL | Error |`,
    `| ---: | --- | ---: | --- | --- | --- |`,
    ...exportReport.steps.map((step) => {
      const action = summarizeAction(step.action);
      return `| ${step.index + 1} | ${step.status} | ${formatDuration(step.durationMs)} | \`${escapeMarkdownTable(action)}\` | ${escapeMarkdownTable(step.url ?? "")} | ${escapeMarkdownTable(step.error ?? "")} |`;
    }),
    ``,
    `## Actions`,
    ``,
    "```json",
    JSON.stringify(exportReport.actions, null, 2),
    "```",
    ``,
    `## Checks`,
    ``,
    "```json",
    JSON.stringify(exportReport.checks, null, 2),
    "```"
  ];

  return lines.join("\n");
}

export function traceToSupportSummary(report: TraceReport, options: { redacted?: boolean } = {}) {
  const exportReport = options.redacted ? redactTraceReport(report) : report;
  const failedStep = exportReport.failedStepIndex == null ? "none" : `step ${exportReport.failedStepIndex + 1}`;
  const failedAction =
    exportReport.failedStepIndex == null
      ? "none"
      : summarizeAction(exportReport.steps.find((step) => step.index === exportReport.failedStepIndex)?.action ?? {});

  return [
    `Action Trace Support Summary`,
    ``,
    `Trace: ${exportReport.id}`,
    `Mode: ${exportReport.mode}`,
    `Status: ${exportReport.status}`,
    `URL: ${exportReport.url}`,
    `Failed step: ${failedStep}`,
    `Failed action: ${failedAction}`,
    `Duration: ${formatDuration(exportReport.durationMs)}`,
    `Firecrawl calls: ${exportReport.summary.firecrawlCalls}`,
    `Diagnosis: ${exportReport.diagnosis ? `${exportReport.diagnosis.code} - ${exportReport.diagnosis.message}` : "none"}`,
    ``,
    `Suggested fix: ${exportReport.diagnosis?.suggestedFix ?? "No fix needed."}`,
    ``,
    `Evidence:`,
    ...(exportReport.diagnosis?.evidence.length
      ? exportReport.diagnosis.evidence.map((item) => `- ${item}`)
      : ["- No failure evidence captured."]),
    ``,
    `Timeline:`,
    ...exportReport.steps.map(
      (step) =>
        `- Step ${step.index + 1}: ${step.status}, ${formatDuration(step.durationMs)}, ${summarizeAction(step.action)}${step.error ? `, error: ${step.error}` : ""}`
    )
  ].join("\n");
}

export function redactTraceReport(report: TraceReport): TraceReport {
  return {
    ...report,
    url: redactText(report.url),
    scrapeId: report.scrapeId ? "[redacted]" : undefined,
    liveViewUrl: undefined,
    diagnosis: report.diagnosis
      ? {
          ...report.diagnosis,
          message: redactText(report.diagnosis.message),
          evidence: report.diagnosis.evidence.map(redactText),
          suggestedFix: redactText(report.diagnosis.suggestedFix)
        }
      : null,
    warnings: report.warnings.map(redactText),
    actions: report.actions.map(redactAction),
    steps: report.steps.map((step) => ({
      ...step,
      url: step.url ? redactText(step.url) : undefined,
      title: step.title ? redactText(step.title) : undefined,
      textExcerpt: step.textExcerpt ? redactText(step.textExcerpt).slice(0, 320) : undefined,
      screenshotBase64: undefined,
      error: step.error ? redactText(step.error) : undefined,
      raw: "[redacted]"
    }))
  };
}

function escapeMarkdownTable(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function redactAction(action: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(action).map(([key, value]) => [
      key,
      typeof value === "string" ? redactText(value) : value
    ])
  );
}

function redactText(value: string) {
  return value
    .replace(/https?:\/\/[^\s)"']+/g, "[url]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [token]")
    .replace(/(api[_-]?key|token|password|secret)["':=\s]+[A-Za-z0-9._~+/=-]+/gi, "$1=[redacted]");
}

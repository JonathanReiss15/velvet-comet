import { formatDuration, summarizeAction } from "@/lib/utils";
import type { TraceReport } from "@/lib/trace-schema";

export function traceToMarkdown(report: TraceReport) {
  const failedStep =
    report.failedStepIndex == null ? "None" : `Step ${report.failedStepIndex + 1}`;
  const diagnosis = report.diagnosis
    ? `${report.diagnosis.code}: ${report.diagnosis.message}`
    : "No failure detected";

  const lines = [
    `# Action Trace Report`,
    ``,
    `- Trace ID: ${report.id}`,
    `- Mode: ${report.mode}`,
    `- Status: ${report.status}`,
    `- URL: ${report.url}`,
    `- Failed step: ${failedStep}`,
    `- Duration: ${formatDuration(report.durationMs)}`,
    `- Diagnosis: ${diagnosis}`,
    ``,
    `## Suggested Fix`,
    ``,
    report.diagnosis?.suggestedFix ?? "No fix needed.",
    ``,
    `## Evidence`,
    ``,
    ...(report.diagnosis?.evidence.length
      ? report.diagnosis.evidence.map((item) => `- ${item}`)
      : ["- No failure evidence captured."]),
    ``,
    `## Timeline`,
    ``,
    `| Step | Status | Duration | Action | URL | Error |`,
    `| ---: | --- | ---: | --- | --- | --- |`,
    ...report.steps.map((step) => {
      const action = summarizeAction(step.action);
      return `| ${step.index + 1} | ${step.status} | ${formatDuration(step.durationMs)} | \`${escapeMarkdownTable(action)}\` | ${escapeMarkdownTable(step.url ?? "")} | ${escapeMarkdownTable(step.error ?? "")} |`;
    }),
    ``,
    `## Actions`,
    ``,
    "```json",
    JSON.stringify(report.actions, null, 2),
    "```",
    ``,
    `## Checks`,
    ``,
    "```json",
    JSON.stringify(report.checks, null, 2),
    "```"
  ];

  return lines.join("\n");
}

function escapeMarkdownTable(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

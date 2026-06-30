import type { ReactNode } from "react";
import { screenshotSrc } from "@/lib/screenshot-source";
import { cn } from "@/lib/utils";
import type { TraceReport, TraceStep } from "@/lib/trace-schema";

export function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="max-h-[360px] overflow-auto border border-[var(--border)] bg-[#080808] p-3 text-xs leading-5 text-[var(--muted-2)]">
      <code>{value}</code>
    </pre>
  );
}

export function EmptyState({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-2 border border-dashed border-[var(--border)] bg-[#0b0b0b] p-6 text-center text-sm text-[var(--muted)]">
      <div className="text-[var(--muted-2)]">{icon}</div>
      <div>{title}</div>
    </div>
  );
}

export function BracketTag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "orange" | "green" | "yellow" | "red";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
        tone === "orange" && "text-[var(--accent)]",
        tone === "green" && "text-green-300",
        tone === "yellow" && "text-yellow-200",
        tone === "red" && "text-red-300",
        tone === "muted" && "text-[var(--muted-2)]",
      )}
    >
      [ {children} ]
    </span>
  );
}

export function PlainTag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "orange" | "green" | "yellow" | "red";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[4px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
        tone === "orange" &&
          "border-orange-500/25 bg-orange-500/10 text-[var(--accent)]",
        tone === "green" &&
          "border-green-500/25 bg-green-500/10 text-green-300",
        tone === "yellow" &&
          "border-yellow-500/25 bg-yellow-500/10 text-yellow-200",
        tone === "red" && "border-red-500/25 bg-red-500/10 text-red-300",
        tone === "muted" &&
          "border-[var(--border)] bg-[#101010] text-[var(--muted-2)]",
      )}
    >
      {children}
    </span>
  );
}

export function formatStatus(
  status: TraceReport["status"] | TraceStep["status"],
) {
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  if (status === "partial") return "Partial";
  if (status === "invalid") return "Invalid";
  if (status === "pending") return "Pending";
  return "Skipped";
}

export function toneForStatus(status: TraceReport["status"]) {
  if (status === "passed") return "green";
  if (status === "failed") return "red";
  if (status === "partial") return "yellow";
  return "muted";
}

export function toneForStepStatus(status: TraceStep["status"]) {
  if (status === "passed") return "green";
  if (status === "failed") return "red";
  if (status === "skipped") return "yellow";
  return "muted";
}

export function toneForDiagnosis(code: string) {
  if (
    code === "SELECTOR_NOT_FOUND" ||
    code === "WAIT_TIMEOUT" ||
    code === "NAVIGATION_CHANGED"
  )
    return "red";
  if (code === "POSSIBLE_BLOCK" || code === "FIRECRAWL_ERROR") return "yellow";
  return "muted";
}

export { screenshotSrc };

"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Image as ImageIcon,
  MousePointerClick,
  PanelRight,
  ScrollText,
  TerminalSquare,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BracketTag,
  CodeBlock,
  EmptyState,
  formatStatus,
  PlainTag,
  screenshotSrc,
  toneForDiagnosis,
  toneForStatus,
  toneForStepStatus,
} from "@/components/workbench/primitives";
import { cn, formatDuration, summarizeAction } from "@/lib/utils";
import type { TraceReport, TraceStep } from "@/lib/trace-schema";

export function OutcomePanel({
  report,
  selectedStep,
  isRunning,
}: {
  report: TraceReport | null;
  selectedStep: TraceStep | null;
  isRunning: boolean;
}) {
  const displayedDurationMs = useDisplayedDuration(report, isRunning);

  if (!report) return null;

  const failedStep =
    report.failedStepIndex == null
      ? null
      : report.steps.find((step) => step.index === report.failedStepIndex);
  const actionText = failedStep
    ? summarizeAction(failedStep.action)
    : selectedStep
      ? summarizeAction(selectedStep.action)
      : "No failed action";
  const outcomeTitle = failedStep
    ? `Step ${failedStep.index + 1} failed: ${actionText}`
    : isRunning
      ? "Trace running"
      : "Trace completed";
  const outcomeDescription =
    report.diagnosis?.message ??
    (isRunning
      ? "Collecting action checkpoints and checks."
      : "All planned actions and checks completed.");
  const suggestedDiagnosis =
    report.status === "failed" ? report.diagnosis : null;
  const metrics = [
    {
      label: "Status",
      value: isRunning ? "Running" : formatStatus(report.status),
      valueClassName: statusValueClassName(report.status, isRunning),
      icon: null,
    },
    {
      label: "Failed step",
      value:
        report.failedStepIndex == null ? "None" : `#${report.failedStepIndex + 1}`,
      icon: failedStep ? <AlertTriangle className="h-3.5 w-3.5" /> : null,
    },
    {
      label: "Duration",
      value: formatDuration(displayedDurationMs),
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    {
      label: "Actions",
      value: String(report.summary.stepsPlanned),
      icon: null,
    },
  ];

  return (
    <section className="border-b border-[var(--border)] bg-[#0b0908]">
      <div
        className={cn(
          "grid gap-4 px-4 py-4 sm:px-6",
          suggestedDiagnosis &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]",
        )}
      >
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <PlainTag tone={toneForStatus(report.status)}>
              {formatStatus(report.status)}
            </PlainTag>
            {report.diagnosis ? (
              <PlainTag tone={toneForDiagnosis(report.diagnosis.code)}>
                {report.diagnosis.code}
              </PlainTag>
            ) : null}
            {report.liveViewUrl ? (
              <a
                href={report.liveViewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--muted-2)] hover:text-[var(--foreground)]"
              >
                Live view
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
          <h2 className="truncate text-lg font-semibold">
            {outcomeTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-2)]">
            {outcomeDescription}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="flex items-center justify-between border border-[var(--border)] bg-[#101010] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase text-[var(--muted)]">
                    {metric.label}
                  </div>
                  <div
                    className={cn(
                      "mt-1 truncate text-sm font-semibold",
                      metric.valueClassName,
                    )}
                  >
                    {metric.value}
                  </div>
                </div>
                {metric.icon ? (
                  <div className="text-[var(--accent)]">{metric.icon}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        {suggestedDiagnosis ? (
          <div className="border border-[var(--border)] bg-[#101010] p-3">
            <div className="text-[11px] font-medium text-[var(--muted)]">
              Suggested Fix
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
              {suggestedDiagnosis.suggestedFix}
            </p>
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted)]">
              Prefix replay used {report.summary.firecrawlCalls} scrape calls;
              production should emit runner-native step events.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function statusValueClassName(
  status: TraceReport["status"],
  isRunning: boolean,
) {
  if (isRunning) return "text-[var(--accent)]";
  if (status === "passed") return "text-green-300";
  if (status === "failed") return "text-red-300";
  if (status === "partial") return "text-yellow-200";
  return "text-[var(--muted-2)]";
}

function useDisplayedDuration(
  report: TraceReport | null,
  isRunning: boolean,
) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const shouldAnimate =
    Boolean(report) && isRunning && report?.completedAt == null;

  useEffect(() => {
    if (!report) {
      setElapsedMs(0);
      return;
    }

    if (!shouldAnimate) {
      setElapsedMs(report.durationMs);
      return;
    }

    const startedAt = Date.parse(report.createdAt);
    const tick = () => {
      setElapsedMs(
        Number.isFinite(startedAt)
          ? Math.max(0, Date.now() - startedAt)
          : report.durationMs,
      );
    };

    tick();
    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [report, shouldAnimate]);

  if (!report) return 0;
  return shouldAnimate ? elapsedMs : report.durationMs;
}

export function TimelinePanel({
  report,
  isRunning,
  activeStepIndex,
  selectedStepIndex,
  onSelectStep,
}: {
  report: TraceReport | null;
  isRunning: boolean;
  activeStepIndex: number | null;
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
}) {
  return (
    <section className="min-h-[360px] bg-[#080808]">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Action Timeline
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {report
                ? `${report.summary.stepsPlanned} planned steps`
                : "No trace loaded"}
            </p>
          </div>
          {report?.diagnosis ? (
            <BracketTag tone={toneForDiagnosis(report.diagnosis.code)}>
              {report.diagnosis.code}
            </BracketTag>
          ) : null}
        </div>
      </div>
      <div className="p-0">
        {report ? (
          <div className="divide-y divide-[var(--border)]">
            {report.steps.map((step) => (
              <TimelineStepRow
                key={step.index}
                step={step}
                isRunning={isRunning}
                isActive={activeStepIndex === step.index}
                isSelected={selectedStepIndex === step.index}
                onSelect={() => onSelectStep(step.index)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<MousePointerClick className="h-5 w-5" />}
            title="No trace loaded"
          />
        )}
      </div>
    </section>
  );
}

function TimelineStepRow({
  step,
  isRunning,
  isActive,
  isSelected,
  onSelect,
}: {
  step: TraceStep;
  isRunning: boolean;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const displayedDurationMs = useDisplayedStepDuration(
    step,
    isRunning && isActive,
  );

  return (
    <button
      className={cn(
        "grid w-full grid-cols-[34px_minmax(0,1fr)_84px] gap-3 px-4 py-3 text-left transition hover:bg-[#111]",
        isSelected && "bg-[#141414]",
      )}
      onClick={onSelect}
    >
      <StepIcon status={step.status} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs text-[var(--muted)]">
            #{step.index + 1}
          </span>
          <span className="truncate text-sm font-medium">
            {summarizeAction(step.action)}
          </span>
        </div>
        <div className="mt-1 truncate text-xs text-[var(--muted)]">
          {step.url ?? step.error ?? "Pending"}
        </div>
      </div>
      <div className="text-right">
        <BracketTag tone={toneForStepStatus(step.status)}>
          {formatStatus(step.status)}
        </BracketTag>
        <div className="mt-1 text-xs text-[var(--muted)]">
          {formatDuration(displayedDurationMs)}
        </div>
      </div>
    </button>
  );
}

function useDisplayedStepDuration(step: TraceStep, isActive: boolean) {
  const [pendingStartedAt, setPendingStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(step.durationMs);
  const shouldAnimate = isActive && step.status === "pending";

  useEffect(() => {
    if (!shouldAnimate) {
      setPendingStartedAt(null);
      setElapsedMs(step.durationMs);
      return;
    }

    const startedAt = Date.now();
    setPendingStartedAt(startedAt);
    setElapsedMs(0);
  }, [shouldAnimate, step.durationMs, step.index]);

  useEffect(() => {
    if (!shouldAnimate || pendingStartedAt == null) return;

    const tick = () => setElapsedMs(Math.max(0, Date.now() - pendingStartedAt));
    tick();
    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [pendingStartedAt, shouldAnimate]);

  return shouldAnimate ? elapsedMs : step.durationMs;
}

export function CheckpointInspector({
  step,
  report,
}: {
  step: TraceStep | null;
  report: TraceReport | null;
}) {
  return (
    <section className="border-b border-[var(--border)] bg-[#080808]">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Checkpoint Inspector
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {step
                ? `Step ${step.index + 1} checkpoint`
                : "No checkpoint selected"}
            </p>
          </div>
          {report ? (
            <PlainTag tone="orange">
              {report.mode === "recorded" ? "Recorded" : "Live"}
            </PlainTag>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        {step ? (
          <Tabs defaultValue="screenshot">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="screenshot">
                <ImageIcon className="mr-1 h-3.5 w-3.5" />
                Shot
              </TabsTrigger>
              <TabsTrigger value="probe">
                <MousePointerClick className="mr-1 h-3.5 w-3.5" />
                Probe
              </TabsTrigger>
              <TabsTrigger value="text">
                <ScrollText className="mr-1 h-3.5 w-3.5" />
                Text
              </TabsTrigger>
              <TabsTrigger value="raw">
                <TerminalSquare className="mr-1 h-3.5 w-3.5" />
                Raw
              </TabsTrigger>
            </TabsList>
            <TabsContent value="screenshot">
              {step.screenshotBase64 ? (
                <TraceScreenshot source={step.screenshotBase64} />
              ) : (
                <EmptyState
                  icon={<ImageIcon className="h-5 w-5" />}
                  title="No screenshot"
                />
              )}
            </TabsContent>
            <TabsContent value="probe">
              <SelectorProbe step={step} />
            </TabsContent>
            <TabsContent value="text">
              <CodeBlock
                value={step.textExcerpt || "No text excerpt captured."}
              />
            </TabsContent>
            <TabsContent value="raw">
              <CodeBlock value={JSON.stringify(step.raw ?? step, null, 2)} />
            </TabsContent>
          </Tabs>
        ) : (
          <EmptyState
            icon={<PanelRight className="h-5 w-5" />}
            title="No trace selected"
          />
        )}
      </div>
    </section>
  );
}

function TraceScreenshot({ source }: { source: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-5 w-5" />}
        title="Screenshot could not load"
      />
    );
  }

  return (
    <div className="overflow-hidden border border-[var(--border)] bg-[#050505]">
      {/* eslint-disable-next-line @next/next/no-img-element -- Trace screenshots may be captured data URIs or Firecrawl-hosted URLs. */}
      <img
        src={screenshotSrc(source)}
        alt="Checkpoint screenshot"
        className="max-h-[560px] min-h-56 w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function SelectorProbe({ step }: { step: TraceStep }) {
  const selectorMatches = step.selectorMatches ?? {};
  const probedSelectors = Object.entries(selectorMatches);
  const actionSelector =
    typeof step.action.selector === "string" ? step.action.selector : null;
  const rows =
    actionSelector && !(actionSelector in selectorMatches)
      ? [[actionSelector, null] as const, ...probedSelectors]
      : probedSelectors;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<MousePointerClick className="h-5 w-5" />}
        title="No selector probe for this step"
      />
    );
  }

  return (
    <div className="space-y-3 border border-[var(--border)] bg-[#101010] p-3">
      <div>
        <div className="text-xs font-semibold text-[var(--foreground)]">
          Selector Probe
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Match counts come from parsing the checkpoint HTML returned by
          Firecrawl.
        </p>
      </div>
      <div className="divide-y divide-[var(--border)] border border-[var(--border)]">
        {rows.map(([selector, count]) => (
          <div
            key={selector}
            className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 bg-[#080808] p-3"
          >
            <code className="truncate text-xs text-[var(--muted-2)]">
              {selector}
            </code>
            <div className="text-right">
              {count == null ? (
                <PlainTag>Not probed</PlainTag>
              ) : (
                <PlainTag tone={count > 0 ? "green" : "red"}>
                  {count} match{count === 1 ? "" : "es"}
                </PlainTag>
              )}
            </div>
          </div>
        ))}
      </div>
      {step.error ? (
        <p className="text-xs leading-5 text-[var(--muted)]">{step.error}</p>
      ) : null}
    </div>
  );
}

export function DiagnosisPanel({ report }: { report: TraceReport | null }) {
  const diagnosis = report?.diagnosis;
  return (
    <section className="border-b border-[var(--border)] bg-[#080808]">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Diagnosis
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {diagnosis ? diagnosis.message : "No failure diagnosis"}
            </p>
          </div>
          {diagnosis ? (
            <PlainTag tone={toneForDiagnosis(diagnosis.code)}>
              {diagnosis.code}
            </PlainTag>
          ) : (
            <PlainTag>Clear</PlainTag>
          )}
        </div>
      </div>
      <div className="space-y-4 p-4">
        {diagnosis ? (
          <>
            <div className="border border-[var(--border)] bg-[#101010] p-3 text-sm leading-6 text-[var(--muted-2)]">
              {diagnosis.suggestedFix}
            </div>
            <div className="space-y-2">
              {diagnosis.evidence.map((item) => (
                <div
                  key={item}
                  className="flex gap-2 text-xs leading-5 text-[var(--muted)]"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            {diagnosis.relatedOptions.length ? (
              <div className="flex flex-wrap gap-2">
                {diagnosis.relatedOptions.map((option) => (
                  <code
                    key={option}
                    className="border border-[var(--border)] bg-[#101010] px-2 py-1 text-[11px] text-[var(--muted-2)]"
                  >
                    {option}
                  </code>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="No failure found"
          />
        )}
        {report?.warnings.length ? (
          <div className="border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs leading-5 text-yellow-100">
            {report.warnings.join(" ")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ExportPanel({
  report,
  copyState,
  redacted,
  onRedactedChange,
  onCopy,
}: {
  report: TraceReport | null;
  copyState: "idle" | "copied";
  redacted: boolean;
  onRedactedChange: (value: boolean) => void;
  onCopy: () => void;
}) {
  const redactedParam = redacted ? "&redacted=true" : "";

  return (
    <section className="bg-[#080808]">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Export
            </h2>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {report ? report.id : "No trace loaded"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--muted-2)]">
            <input
              type="checkbox"
              checked={redacted}
              onChange={(event) => onRedactedChange(event.target.checked)}
              className="accent-[var(--accent)]"
            />
            Redacted
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        <Button asChild variant="secondary" size="sm" disabled={!report}>
          <a
            href={
              report
                ? `/api/traces/${report.id}/export?format=json${redactedParam}`
                : "#"
            }
          >
            <FileJson className="h-4 w-4" />
            JSON
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm" disabled={!report}>
          <a
            href={
              report
                ? `/api/traces/${report.id}/export?format=markdown${redactedParam}`
                : "#"
            }
          >
            <Download className="h-4 w-4" />
            MD
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm" disabled={!report}>
          <a
            href={
              report
                ? `/api/traces/${report.id}/export?format=support${redactedParam}`
                : "#"
            }
          >
            <CircleHelp className="h-4 w-4" />
            Support
          </a>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!report}
          onClick={onCopy}
        >
          <Copy className="h-4 w-4" />
          {copyState === "copied" ? "Copied for LLM" : "Copy for LLM"}
        </Button>
      </div>
    </section>
  );
}

function StepIcon({ status }: { status: TraceStep["status"] }) {
  const className = "mt-0.5 h-6 w-6";
  if (status === "passed")
    return <CheckCircle2 className={cn(className, "text-green-400")} />;
  if (status === "failed")
    return <XCircle className={cn(className, "text-red-400")} />;
  if (status === "skipped")
    return <AlertTriangle className={cn(className, "text-yellow-400")} />;
  return <Clock className={cn(className, "text-[var(--muted)]")} />;
}

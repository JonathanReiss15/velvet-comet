"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bell,
  BookOpenText,
  CircleHelp,
  FileJson,
  Home,
  KeyRound,
  Monitor,
  Settings2,
  TerminalSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FirecrawlMark,
  RailButton,
  TopUtility,
} from "@/components/workbench/chrome";
import { defaultFirecrawl } from "@/components/workbench/defaults";
import { PlainTag, toneForStatus } from "@/components/workbench/primitives";
import {
  CheckpointInspector,
  DiagnosisPanel,
  ExportPanel,
  OutcomePanel,
  TimelinePanel,
} from "@/components/workbench/trace-panels";
import { TraceSetup } from "@/components/workbench/trace-setup";
import { validateTraceSetup } from "@/components/workbench/trace-validation";
import type { Example, ExamplesResponse } from "@/components/workbench/types";
import { redactTraceReport } from "@/lib/report-export";
import type { TraceStreamEvent } from "@/lib/trace-events";
import type { TraceReport, TraceRequestInput } from "@/lib/trace-schema";
import { cn } from "@/lib/utils";

export function Workbench() {
  const [examples, setExamples] = useState<Example[]>([]);
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [actionsJson, setActionsJson] = useState("");
  const [checksJson, setChecksJson] = useState("");
  const [firecrawl, setFirecrawl] = useState(defaultFirecrawl);
  const [report, setReport] = useState<TraceReport | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [redactedExport, setRedactedExport] = useState(true);
  const runControllerRef = useRef<AbortController | null>(null);
  const runTokenRef = useRef(0);

  useEffect(() => {
    fetch("/api/examples")
      .then((response) => response.json())
      .then((data: ExamplesResponse) => {
        setExamples(data.examples);
        const initialExample =
          data.examples.find((example) => example.id === "selector-missing-books") ??
          data.examples[0];
        if (initialExample) {
          setSelectedExampleId(initialExample.id);
          setUrl(initialExample.url);
          setActionsJson(JSON.stringify(initialExample.actions, null, 2));
          setChecksJson(JSON.stringify(initialExample.checks, null, 2));
        }
      })
      .catch(() => setError("Could not load examples."));
  }, []);

  useEffect(() => {
    return () => {
      runControllerRef.current?.abort();
      runControllerRef.current = null;
      runTokenRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!report) return;
    setSelectedStepIndex(report.failedStepIndex ?? 0);
  }, [report]);

  const selectedStep = useMemo(() => {
    if (!report) return null;
    return (
      report.steps.find((step) => step.index === selectedStepIndex) ??
      report.steps[0] ??
      null
    );
  }, [report, selectedStepIndex]);

  const setupValidation = useMemo(
    () =>
      validateTraceSetup({
        selectedExampleId,
        url,
        actionsJson,
        checksJson,
        firecrawl,
      }),
    [actionsJson, checksJson, firecrawl, selectedExampleId, url],
  );

  async function runExample(example: Example) {
    const actions = JSON.stringify(example.actions, null, 2);
    const checks = JSON.stringify(example.checks, null, 2);

    setSelectedExampleId(example.id);
    setUrl(example.url);
    setActionsJson(actions);
    setChecksJson(checks);
    setFirecrawl(defaultFirecrawl);
    setReport(null);
    setSelectedStepIndex(0);
    setActiveStepIndex(null);
    setError(null);
    setCopyState("idle");

    const validation = validateTraceSetup({
      selectedExampleId: example.id,
      url: example.url,
      actionsJson: actions,
      checksJson: checks,
      firecrawl: defaultFirecrawl,
    });

    if (!validation.payload) {
      setError(validation.issues[0] ?? "Example failed validation.");
      return;
    }

    await executeTrace(validation.payload);
  }

  function startManualEntry() {
    cancelActiveRun();
    setSelectedExampleId(null);
    setUrl("");
    setActionsJson("");
    setChecksJson("");
    setFirecrawl(defaultFirecrawl);
    setReport(null);
    setSelectedStepIndex(0);
    setActiveStepIndex(null);
    setError(null);
    setCopyState("idle");
  }

  function markCustomChange() {
    setSelectedExampleId(null);
    if (!report) {
      setSelectedStepIndex(0);
    }
    setCopyState("idle");
  }

  async function runTrace() {
    const validation = validateTraceSetup({
      selectedExampleId,
      url,
      actionsJson,
      checksJson,
      firecrawl,
    });

    if (!validation.payload) {
      setError(validation.issues[0] ?? "Complete trace setup before running.");
      return;
    }

    await executeTrace(validation.payload);
  }

  function cancelActiveRun() {
    runControllerRef.current?.abort();
    runControllerRef.current = null;
    runTokenRef.current += 1;
    setIsRunning(false);
  }

  async function executeTrace(payload: TraceRequestInput) {
    runControllerRef.current?.abort();
    const controller = new AbortController();
    const runToken = runTokenRef.current + 1;
    runControllerRef.current = controller;
    runTokenRef.current = runToken;
    setIsRunning(true);
    setActiveStepIndex(null);
    setError(null);
    setCopyState("idle");

    try {
      const response = await fetch("/api/traces/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Trace request failed.");
      }
      if (!response.body) throw new Error("Trace stream was empty.");

      await readTraceStream(response.body, (event) => {
        if (runTokenRef.current !== runToken || controller.signal.aborted) {
          return;
        }
        handleTraceEvent(event);
      });
    } catch (caught) {
      if (
        runTokenRef.current !== runToken ||
        (caught instanceof DOMException && caught.name === "AbortError")
      ) {
        return;
      }
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      if (runTokenRef.current === runToken) {
        runControllerRef.current = null;
        setIsRunning(false);
      }
    }
  }

  function handleTraceEvent(event: TraceStreamEvent) {
    if (event.type === "trace.started") {
      setReport(event.report);
      setSelectedStepIndex(0);
      setActiveStepIndex(null);
      return;
    }

    if (event.type === "step.started") {
      setReport((current) => updateStepInReport(current, event.step));
      setSelectedStepIndex(event.step.index);
      setActiveStepIndex(event.step.index);
      return;
    }

    if (event.type === "step.completed") {
      setReport((current) =>
        updateStepInReport(current, event.step, { summary: event.summary }),
      );
      setActiveStepIndex((current) =>
        current === event.step.index ? null : current,
      );
      return;
    }

    if (event.type === "step.failed") {
      setReport((current) =>
        updateStepInReport(current, event.step, {
          status: "failed",
          failedStepIndex: event.failedStepIndex,
          diagnosis: event.diagnosis,
          summary: event.summary,
        }),
      );
      setSelectedStepIndex(event.failedStepIndex);
      setActiveStepIndex(null);
      return;
    }

    if (event.type === "steps.skipped") {
      setReport((current) => updateStepsInReport(current, event.steps));
      return;
    }

    if (event.type === "trace.completed") {
      setReport(event.report);
      setSelectedStepIndex(event.report.failedStepIndex ?? 0);
      setActiveStepIndex(null);
      return;
    }

    setActiveStepIndex(null);
    setError(event.error);
  }

  async function copyReport() {
    if (!report) return;
    const exportReport = redactedExport ? redactTraceReport(report) : report;
    await navigator.clipboard.writeText(JSON.stringify(exportReport, null, 2));
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="grid min-h-screen grid-cols-[48px_minmax(0,1fr)]">
        <Sidebar />

        <section className="min-w-0">
          <TopBar />

          <div className="mx-auto min-h-[calc(100vh-52px)] max-w-[1220px] border-x border-[var(--border)] bg-[#070707]/92">
            <Hero report={report} />

            <OutcomePanel
              report={report}
              selectedStep={selectedStep}
              isRunning={isRunning}
            />

            <div
              className={cn(
                "grid grid-cols-1",
                report &&
                  "xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(320px,0.95fr)_minmax(360px,1.2fr)]",
              )}
            >
              <div
                className={cn(
                  "border-b border-[var(--border)]",
                  report && "xl:border-r",
                  report ? "order-3 xl:order-1" : "order-1",
                )}
              >
                <TraceSetup
                  examples={examples}
                  selectedExampleId={selectedExampleId}
                  url={url}
                  actionsJson={actionsJson}
                  checksJson={checksJson}
                  firecrawl={firecrawl}
                  isRunning={isRunning}
                  hasReport={Boolean(report)}
                  error={error}
                  validation={setupValidation}
                  onLoadExample={runExample}
                  onStartCustom={startManualEntry}
                  onClear={startManualEntry}
                  onUrlChange={(value) => {
                    markCustomChange();
                    setUrl(value);
                  }}
                  onActionsChange={(value) => {
                    markCustomChange();
                    setActionsJson(value);
                  }}
                  onChecksChange={(value) => {
                    markCustomChange();
                    setChecksJson(value);
                  }}
                  onFirecrawlChange={(value) => {
                    markCustomChange();
                    setFirecrawl(value);
                  }}
                  onRun={runTrace}
                />
              </div>

              {report ? (
                <>
                  <div className="order-1 border-b border-[var(--border)] xl:order-2 2xl:border-r">
                    <TimelinePanel
                      report={report}
                      isRunning={isRunning}
                      activeStepIndex={activeStepIndex}
                      selectedStepIndex={selectedStepIndex}
                      onSelectStep={setSelectedStepIndex}
                    />
                  </div>

                  <div className="order-2 grid grid-cols-1 xl:order-3 xl:col-span-2 2xl:col-span-1">
                    <CheckpointInspector step={selectedStep} report={report} />
                    <DiagnosisPanel report={report} />
                    <ExportPanel
                      report={report}
                      copyState={copyState}
                      redacted={redactedExport}
                      onRedactedChange={setRedactedExport}
                      onCopy={copyReport}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

async function readTraceStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: TraceStreamEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = flushTraceStreamBuffer(buffer, onEvent);
  }

  buffer += decoder.decode();
  flushTraceStreamBuffer(`${buffer}\n\n`, onEvent);
}

function flushTraceStreamBuffer(
  buffer: string,
  onEvent: (event: TraceStreamEvent) => void,
) {
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() ?? "";

  for (const block of blocks) {
    const event = parseTraceStreamEvent(block);
    if (event) onEvent(event);
  }

  return remainder;
}

function parseTraceStreamEvent(block: string): TraceStreamEvent | null {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n");

  return data ? (JSON.parse(data) as TraceStreamEvent) : null;
}

function updateStepInReport(
  report: TraceReport | null,
  step: TraceReport["steps"][number],
  overrides: Partial<TraceReport> = {},
) {
  if (!report) return report;
  return {
    ...report,
    ...overrides,
    steps: replaceStep(report.steps, step),
  };
}

function updateStepsInReport(
  report: TraceReport | null,
  steps: TraceReport["steps"],
) {
  if (!report) return report;
  return {
    ...report,
    steps: steps.reduce(replaceStep, report.steps),
  };
}

function replaceStep(
  steps: TraceReport["steps"],
  step: TraceReport["steps"][number],
) {
  const nextSteps = [...steps];
  const existingIndex = nextSteps.findIndex((item) => item.index === step.index);
  if (existingIndex >= 0) {
    nextSteps[existingIndex] = step;
  } else {
    nextSteps.push(step);
    nextSteps.sort((a, b) => a.index - b.index);
  }
  return nextSteps;
}

function Sidebar() {
  return (
    <aside className="flex min-h-screen flex-col items-center border-r border-[var(--border)] bg-[#060606]">
      <div className="flex h-[52px] w-full items-center justify-center border-b border-[var(--border)]">
        <FirecrawlMark />
      </div>
      <nav className="flex w-full flex-1 flex-col items-center gap-1 py-2">
        <RailButton
          active
          icon={<Home className="h-4 w-4" />}
          label="Dashboard"
        />
        <RailButton icon={<Activity className="h-4 w-4" />} label="Traces" />
        <RailButton
          icon={<TerminalSquare className="h-4 w-4" />}
          label="Runs"
        />
        <RailButton icon={<FileJson className="h-4 w-4" />} label="Exports" />
        <RailButton icon={<Settings2 className="h-4 w-4" />} label="Options" />
      </nav>
      <div className="w-full border-t border-[var(--border)] p-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[#101010] text-[10px] font-semibold text-orange-200">
          JR
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 overflow-hidden border-b border-[var(--border)] bg-[#070707] px-3 py-2">
      <button className="inline-flex h-8 items-center gap-2 rounded-[5px] border border-[var(--border)] bg-[#111] px-3 text-sm font-medium text-[var(--foreground)]">
        <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-[var(--accent)] text-[9px] font-bold text-white">
          P
        </span>
        Personal Team
      </button>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <TopUtility
          icon={<Bell className="h-4 w-4" />}
          label="Notifications"
          compact
        />
        <TopUtility
          icon={<Monitor className="h-4 w-4" />}
          label="Monitor"
          compact
        />
        <TopUtility
          icon={<CircleHelp className="h-4 w-4" />}
          label="Help"
          hideBelowSm
        />
        <TopUtility
          icon={<BookOpenText className="h-4 w-4" />}
          label="Docs"
          hideBelowSm
        />
        <Button size="sm" className="hidden rounded-[5px] px-3 sm:inline-flex">
          <KeyRound className="h-3.5 w-3.5" />
          Upgrade
        </Button>
      </div>
    </header>
  );
}

function Hero({ report }: { report: TraceReport | null }) {
  return (
    <section className="border-b border-[var(--border)] px-4 py-7 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-normal text-[var(--foreground)]">
            Action Trace Workbench
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Diagnose Firecrawl action failures with live step evidence.
          </p>
        </div>
        {report ? (
          <div className="flex items-center gap-3">
            <PlainTag tone={toneForStatus(report.status)}>
              {report.status}
            </PlainTag>
          </div>
        ) : null}
      </div>
    </section>
  );
}

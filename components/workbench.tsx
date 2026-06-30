"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Download,
  FileJson,
  Image as ImageIcon,
  Loader2,
  MousePointerClick,
  PanelRight,
  Play,
  Radio,
  ScrollText,
  SearchCode,
  Settings2,
  TerminalSquare,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDuration, summarizeAction } from "@/lib/utils";
import type { TraceReport, TraceStep } from "@/lib/trace-schema";

type Example = {
  id: string;
  label: string;
  description: string;
  url: string;
  actions: Array<Record<string, unknown>>;
  checks: Array<Record<string, unknown>>;
  expectedDiagnosis: string;
};

type ExamplesResponse = {
  examples: Example[];
};

const defaultActions = JSON.stringify(
  [
    { type: "wait", selector: ".product_pod" },
    { type: "click", selector: ".product_pod h3 a" },
    { type: "wait", milliseconds: 500 },
    { type: "click", selector: "[data-testid='export-table']" }
  ],
  null,
  2
);

const defaultChecks = JSON.stringify([{ type: "selector_exists", selector: "[data-testid='export-table']" }], null, 2);

const defaultFirecrawl = {
  waitFor: 500,
  timeout: 60000,
  mobile: false,
  proxy: "auto",
  onlyMainContent: true,
  location: {
    country: ""
  },
  profile: {
    name: ""
  }
};

export function Workbench() {
  const [examples, setExamples] = useState<Example[]>([]);
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>("selector-missing-books");
  const [mode, setMode] = useState<"fixture" | "live">("fixture");
  const [url, setUrl] = useState("https://books.toscrape.com/");
  const [actionsJson, setActionsJson] = useState(defaultActions);
  const [checksJson, setChecksJson] = useState(defaultChecks);
  const [firecrawl, setFirecrawl] = useState(defaultFirecrawl);
  const [report, setReport] = useState<TraceReport | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    fetch("/api/examples")
      .then((response) => response.json())
      .then((data: ExamplesResponse) => {
        setExamples(data.examples);
        const first = data.examples[0];
        if (first) loadExample(first, false);
      })
      .catch(() => setError("Could not load examples."));
  }, []);

  useEffect(() => {
    if (!report) return;
    setSelectedStepIndex(report.failedStepIndex ?? 0);
  }, [report]);

  const selectedStep = useMemo(() => {
    if (!report) return null;
    return report.steps.find((step) => step.index === selectedStepIndex) ?? report.steps[0] ?? null;
  }, [report, selectedStepIndex]);

  function loadExample(example: Example, clearReport = true) {
    setSelectedExampleId(example.id);
    setUrl(example.url);
    setActionsJson(JSON.stringify(example.actions, null, 2));
    setChecksJson(JSON.stringify(example.checks, null, 2));
    setError(null);
    if (clearReport) setReport(null);
  }

  function markCustom() {
    setSelectedExampleId(null);
  }

  async function runTrace() {
    setIsRunning(true);
    setError(null);
    setCopyState("idle");
    try {
      const actions = JSON.parse(actionsJson);
      const checks = JSON.parse(checksJson || "[]");
      const payload = {
        mode,
        exampleId: selectedExampleId ?? undefined,
        url,
        actions,
        checks,
        firecrawl: {
          waitFor: Number(firecrawl.waitFor),
          timeout: Number(firecrawl.timeout),
          mobile: Boolean(firecrawl.mobile),
          proxy: firecrawl.proxy,
          onlyMainContent: Boolean(firecrawl.onlyMainContent),
          ...(firecrawl.location.country ? { location: { country: firecrawl.location.country.toUpperCase() } } : {}),
          ...(firecrawl.profile.name ? { profile: { name: firecrawl.profile.name } } : {})
        }
      };

      const response = await fetch("/api/traces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Trace request failed.");
      }
      setReport(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsRunning(false);
    }
  }

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  return (
    <main className="min-h-screen bg-black/35">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[218px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--border)] bg-[#070707]/95 lg:block">
          <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)]">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">Firecrawl</div>
              <div className="text-[11px] text-[var(--muted)]">Trace Workbench</div>
            </div>
          </div>
          <nav className="space-y-1 p-3">
            <NavItem active icon={<SearchCode className="h-4 w-4" />} label="Action traces" />
            <NavItem icon={<TerminalSquare className="h-4 w-4" />} label="Runs" />
            <NavItem icon={<FileJson className="h-4 w-4" />} label="Exports" />
            <NavItem icon={<Settings2 className="h-4 w-4" />} label="Options" />
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[#070707]/90 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)]">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-normal">Action Trace Workbench</h1>
                <p className="text-xs text-[var(--muted)]">Step evidence for Firecrawl action chains</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={mode === "fixture" ? "orange" : "green"}>
                <Radio className="h-3 w-3" />
                {mode === "fixture" ? "Fixture mode" : "Live Interact trace"}
              </Badge>
              {report ? <Badge variant={badgeForStatus(report.status)}>{report.status}</Badge> : null}
            </div>
          </header>

          <div className="space-y-4 p-4">
            <MetricStrip report={report} isRunning={isRunning} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(320px,0.95fr)_minmax(360px,1.2fr)]">
              <TraceSetup
                examples={examples}
                selectedExampleId={selectedExampleId}
                mode={mode}
                url={url}
                actionsJson={actionsJson}
                checksJson={checksJson}
                firecrawl={firecrawl}
                isRunning={isRunning}
                error={error}
                onLoadExample={loadExample}
                onModeChange={setMode}
                onUrlChange={(value) => {
                  markCustom();
                  setUrl(value);
                }}
                onActionsChange={(value) => {
                  markCustom();
                  setActionsJson(value);
                }}
                onChecksChange={(value) => {
                  markCustom();
                  setChecksJson(value);
                }}
                onFirecrawlChange={setFirecrawl}
                onRun={runTrace}
              />

              <TimelinePanel report={report} selectedStepIndex={selectedStepIndex} onSelectStep={setSelectedStepIndex} />

              <div className="space-y-4 xl:col-span-2 2xl:col-span-1">
                <CheckpointInspector step={selectedStep} report={report} />
                <DiagnosisPanel report={report} />
                <ExportPanel report={report} copyState={copyState} onCopy={copyReport} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavItem({ active, icon, label }: { active?: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--muted)]",
        active && "bg-[var(--accent-soft)] text-orange-100"
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function MetricStrip({ report, isRunning }: { report: TraceReport | null; isRunning: boolean }) {
  const metrics = [
    {
      label: "Status",
      value: isRunning ? "running" : report?.status ?? "ready",
      icon: isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />
    },
    {
      label: "Failed step",
      value: report?.failedStepIndex == null ? "none" : `#${report.failedStepIndex + 1}`,
      icon: <AlertTriangle className="h-4 w-4" />
    },
    {
      label: "Duration",
      value: report ? formatDuration(report.durationMs) : "n/a",
      icon: <Clock className="h-4 w-4" />
    },
    {
      label: "Firecrawl calls",
      value: report ? String(report.summary.firecrawlCalls) : "0",
      icon: <Radio className="h-4 w-4" />
    },
    {
      label: "Screenshots",
      value: report ? String(report.summary.screenshotsCaptured) : "0",
      icon: <ImageIcon className="h-4 w-4" />
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-[#0b0b0b]/95">
          <CardContent className="flex items-center justify-between p-3">
            <div>
              <div className="text-[11px] uppercase text-[var(--muted)]">{metric.label}</div>
              <div className="mt-1 text-base font-semibold">{metric.value}</div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[#141414] text-orange-200">
              {metric.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TraceSetup(props: {
  examples: Example[];
  selectedExampleId: string | null;
  mode: "fixture" | "live";
  url: string;
  actionsJson: string;
  checksJson: string;
  firecrawl: typeof defaultFirecrawl;
  isRunning: boolean;
  error: string | null;
  onLoadExample: (example: Example) => void;
  onModeChange: (mode: "fixture" | "live") => void;
  onUrlChange: (value: string) => void;
  onActionsChange: (value: string) => void;
  onChecksChange: (value: string) => void;
  onFirecrawlChange: (value: typeof defaultFirecrawl) => void;
  onRun: () => void;
}) {
  return (
    <Card className="h-fit">
      <CardHeader className="border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Trace setup</CardTitle>
            <CardDescription>URL, actions, checks, and run mode</CardDescription>
          </div>
          <Button onClick={props.onRun} disabled={props.isRunning} size="sm">
            {props.isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={props.mode === "fixture" ? "default" : "secondary"}
            size="sm"
            onClick={() => props.onModeChange("fixture")}
          >
            Fixture
          </Button>
          <Button
            type="button"
            variant={props.mode === "live" ? "default" : "secondary"}
            size="sm"
            onClick={() => props.onModeChange("live")}
          >
            Live
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Examples</Label>
          <div className="space-y-2">
            {props.examples.map((example) => (
              <button
                key={example.id}
                className={cn(
                  "w-full rounded-md border p-3 text-left transition",
                  props.selectedExampleId === example.id
                    ? "border-orange-500/60 bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[#101010] hover:bg-[#171717]"
                )}
                onClick={() => props.onLoadExample(example)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{example.label}</span>
                  <Badge variant="default">{example.expectedDiagnosis}</Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{example.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input id="url" value={props.url} onChange={(event) => props.onUrlChange(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="actions">Actions JSON</Label>
          <Textarea
            id="actions"
            value={props.actionsJson}
            onChange={(event) => props.onActionsChange(event.target.value)}
            spellCheck={false}
            className="h-56 resize-y font-mono text-xs leading-5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checks">Checks JSON</Label>
          <Textarea
            id="checks"
            value={props.checksJson}
            onChange={(event) => props.onChecksChange(event.target.value)}
            spellCheck={false}
            className="h-28 resize-y font-mono text-xs leading-5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="waitFor">
            <Input
              type="number"
              value={props.firecrawl.waitFor}
              onChange={(event) => props.onFirecrawlChange({ ...props.firecrawl, waitFor: Number(event.target.value) })}
            />
          </Field>
          <Field label="timeout">
            <Input
              type="number"
              value={props.firecrawl.timeout}
              onChange={(event) => props.onFirecrawlChange({ ...props.firecrawl, timeout: Number(event.target.value) })}
            />
          </Field>
          <Field label="proxy">
            <select
              value={props.firecrawl.proxy}
              onChange={(event) => props.onFirecrawlChange({ ...props.firecrawl, proxy: event.target.value })}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[#101010] px-3 text-sm outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="auto">auto</option>
              <option value="basic">basic</option>
              <option value="stealth">stealth</option>
            </select>
          </Field>
          <Field label="country">
            <Input
              value={props.firecrawl.location.country}
              maxLength={2}
              onChange={(event) =>
                props.onFirecrawlChange({
                  ...props.firecrawl,
                  location: { country: event.target.value }
                })
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[#101010] px-3 py-2 text-xs text-[var(--muted-2)]">
            <input
              type="checkbox"
              checked={props.firecrawl.mobile}
              onChange={(event) => props.onFirecrawlChange({ ...props.firecrawl, mobile: event.target.checked })}
              className="accent-[var(--accent)]"
            />
            mobile
          </label>
          <label className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[#101010] px-3 py-2 text-xs text-[var(--muted-2)]">
            <input
              type="checkbox"
              checked={props.firecrawl.onlyMainContent}
              onChange={(event) => props.onFirecrawlChange({ ...props.firecrawl, onlyMainContent: event.target.checked })}
              className="accent-[var(--accent)]"
            />
            main content
          </label>
        </div>

        <Field label="profile">
          <Input
            value={props.firecrawl.profile.name}
            onChange={(event) =>
              props.onFirecrawlChange({
                ...props.firecrawl,
                profile: { name: event.target.value }
              })
            }
          />
        </Field>

        {props.error ? (
          <div className="rounded-md border border-red-500/35 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
            {props.error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function TimelinePanel({
  report,
  selectedStepIndex,
  onSelectStep
}: {
  report: TraceReport | null;
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
}) {
  return (
    <Card className="min-h-[620px]">
      <CardHeader className="border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Action timeline</CardTitle>
            <CardDescription>{report ? `${report.summary.stepsPlanned} planned steps` : "No trace loaded"}</CardDescription>
          </div>
          {report?.diagnosis ? <Badge variant={badgeForDiagnosis(report.diagnosis.code)}>{report.diagnosis.code}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {report ? (
          <div className="divide-y divide-[var(--border)]">
            {report.steps.map((step) => (
              <button
                key={step.index}
                className={cn(
                  "grid w-full grid-cols-[34px_minmax(0,1fr)_70px] gap-3 px-4 py-3 text-left transition hover:bg-[#111]",
                  selectedStepIndex === step.index && "bg-[#141414]"
                )}
                onClick={() => onSelectStep(step.index)}
              >
                <StepIcon status={step.status} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs text-[var(--muted)]">#{step.index + 1}</span>
                    <span className="truncate text-sm font-medium">{summarizeAction(step.action)}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-[var(--muted)]">{step.url ?? step.error ?? "pending"}</div>
                </div>
                <div className="text-right text-xs text-[var(--muted-2)]">{formatDuration(step.durationMs)}</div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon={<MousePointerClick className="h-5 w-5" />} title="Run a trace" />
        )}
      </CardContent>
    </Card>
  );
}

function StepIcon({ status }: { status: TraceStep["status"] }) {
  const className = "mt-0.5 h-6 w-6";
  if (status === "passed") return <CheckCircle2 className={cn(className, "text-green-400")} />;
  if (status === "failed") return <XCircle className={cn(className, "text-red-400")} />;
  if (status === "skipped") return <AlertTriangle className={cn(className, "text-yellow-400")} />;
  return <Clock className={cn(className, "text-[var(--muted)]")} />;
}

function CheckpointInspector({ step, report }: { step: TraceStep | null; report: TraceReport | null }) {
  return (
    <Card>
      <CardHeader className="border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Checkpoint inspector</CardTitle>
            <CardDescription>{step ? `Step ${step.index + 1} checkpoint` : "No checkpoint selected"}</CardDescription>
          </div>
          {report ? <Badge variant={report.mode === "fixture" ? "orange" : "green"}>{report.mode}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {step ? (
          <Tabs defaultValue="screenshot">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="screenshot">
                <ImageIcon className="mr-1 h-3.5 w-3.5" />
                Shot
              </TabsTrigger>
              <TabsTrigger value="text">
                <ScrollText className="mr-1 h-3.5 w-3.5" />
                Text
              </TabsTrigger>
              <TabsTrigger value="raw">
                <TerminalSquare className="mr-1 h-3.5 w-3.5" />
                Raw
              </TabsTrigger>
              <TabsTrigger value="code">
                <Code2 className="mr-1 h-3.5 w-3.5" />
                Code
              </TabsTrigger>
            </TabsList>
            <TabsContent value="screenshot">
              {step.screenshotBase64 ? (
                <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[#101010]">
                  <img src={screenshotSrc(step.screenshotBase64)} alt="" className="aspect-[16/10] w-full object-cover" />
                </div>
              ) : (
                <EmptyState icon={<ImageIcon className="h-5 w-5" />} title="No screenshot" />
              )}
            </TabsContent>
            <TabsContent value="text">
              <CodeBlock value={step.textExcerpt || "No text excerpt captured."} />
            </TabsContent>
            <TabsContent value="raw">
              <CodeBlock value={JSON.stringify(step.raw ?? step, null, 2)} />
            </TabsContent>
            <TabsContent value="code">
              <CodeBlock value={step.generatedCode ?? "No generated code captured for this step."} />
            </TabsContent>
          </Tabs>
        ) : (
          <EmptyState icon={<PanelRight className="h-5 w-5" />} title="No trace selected" />
        )}
      </CardContent>
    </Card>
  );
}

function DiagnosisPanel({ report }: { report: TraceReport | null }) {
  const diagnosis = report?.diagnosis;
  return (
    <Card>
      <CardHeader className="border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Diagnosis</CardTitle>
            <CardDescription>{diagnosis ? diagnosis.message : "No failure diagnosis"}</CardDescription>
          </div>
          {diagnosis ? <Badge variant={badgeForDiagnosis(diagnosis.code)}>{diagnosis.code}</Badge> : <Badge>clear</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {diagnosis ? (
          <>
            <div className="rounded-md border border-[var(--border)] bg-[#101010] p-3 text-sm leading-6 text-[var(--muted-2)]">
              {diagnosis.suggestedFix}
            </div>
            <div className="space-y-2">
              {diagnosis.evidence.map((item) => (
                <div key={item} className="flex gap-2 text-xs leading-5 text-[var(--muted)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            {diagnosis.relatedOptions.length ? (
              <div className="flex flex-wrap gap-2">
                {diagnosis.relatedOptions.map((option) => (
                  <Badge key={option}>{option}</Badge>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="No failure found" />
        )}
        {report?.warnings.length ? (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs leading-5 text-yellow-100">
            {report.warnings.join(" ")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ExportPanel({
  report,
  copyState,
  onCopy
}: {
  report: TraceReport | null;
  copyState: "idle" | "copied";
  onCopy: () => void;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-[var(--border)]">
        <CardTitle>Export</CardTitle>
        <CardDescription>{report ? report.id : "No trace loaded"}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 pt-4">
        <Button asChild variant="secondary" size="sm" disabled={!report}>
          <a href={report ? `/api/traces/${report.id}/export?format=json` : "#"}>
            <FileJson className="h-4 w-4" />
            JSON
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm" disabled={!report}>
          <a href={report ? `/api/traces/${report.id}/export?format=markdown` : "#"}>
            <Download className="h-4 w-4" />
            MD
          </a>
        </Button>
        <Button variant="secondary" size="sm" disabled={!report} onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {copyState === "copied" ? "Copied" : "Copy"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="max-h-[360px] overflow-auto rounded-md border border-[var(--border)] bg-[#080808] p-3 text-xs leading-5 text-[var(--muted-2)]">
      <code>{value}</code>
    </pre>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--border)] bg-[#0b0b0b] p-6 text-center text-sm text-[var(--muted)]">
      <div className="text-[var(--muted-2)]">{icon}</div>
      <div>{title}</div>
    </div>
  );
}

function screenshotSrc(base64: string) {
  const trimmed = base64.trim();
  const mime = trimmed.startsWith("PHN2Zy") ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${trimmed}`;
}

function badgeForStatus(status: TraceReport["status"]) {
  if (status === "passed") return "green";
  if (status === "failed") return "red";
  if (status === "partial") return "yellow";
  return "default";
}

function badgeForDiagnosis(code: string) {
  if (code === "SELECTOR_NOT_FOUND" || code === "WAIT_TIMEOUT" || code === "NAVIGATION_CHANGED") return "red";
  if (code === "POSSIBLE_BLOCK" || code === "FIRECRAWL_ERROR") return "yellow";
  return "default";
}

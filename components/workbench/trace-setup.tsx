import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  FileJson,
  Loader2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlainTag } from "@/components/workbench/primitives";
import type { TraceSetupValidation } from "@/components/workbench/trace-validation";
import type { Example, FirecrawlFormState } from "@/components/workbench/types";
import { cn } from "@/lib/utils";

export function TraceSetup(props: {
  examples: Example[];
  selectedExampleId: string | null;
  url: string;
  actionsJson: string;
  checksJson: string;
  firecrawl: FirecrawlFormState;
  isRunning: boolean;
  hasReport: boolean;
  error: string | null;
  validation: TraceSetupValidation;
  onLoadExample: (example: Example) => void;
  onStartCustom: () => void;
  onClear: () => void;
  onUrlChange: (value: string) => void;
  onActionsChange: (value: string) => void;
  onChecksChange: (value: string) => void;
  onFirecrawlChange: (value: FirecrawlFormState) => void;
  onRun: () => void;
}) {
  const selectedExample = props.examples.find(
    (example) => example.id === props.selectedExampleId,
  );
  const canRun = props.validation.isReady && !props.isRunning;
  const validationTone = props.validation.isReady ? "green" : "yellow";
  const showSourcePicker = !props.hasReport;

  return (
    <section className="h-fit bg-[#080808]">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Trace Setup
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Source page and action trace
            </p>
          </div>
          <div className="flex items-center gap-2">
            {props.hasReport ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={props.onClear}
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </Button>
            ) : null}
            <Button
              data-testid="run-trace"
              onClick={props.onRun}
              disabled={!canRun}
              size="sm"
            >
              {props.isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4">
        {showSourcePicker ? (
          <>
            <div className="border border-[var(--border)] bg-[#101010] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--foreground)]">
                    Workflow Source
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Pick an example to run it now, or enter a custom scrape
                    request below.
                  </p>
                </div>
                <PlainTag tone={validationTone}>
                  {props.validation.isReady ? "Ready" : "Setup Required"}
                </PlainTag>
              </div>

              <ul className="mt-3 space-y-2">
                {props.examples.map((example) => {
                  const isSelected = selectedExample?.id === example.id;

                  return (
                    <li key={example.id}>
                      <button
                        type="button"
                        onClick={() => props.onLoadExample(example)}
                        disabled={props.isRunning}
                        className={cn(
                          "w-full border border-[var(--border)] bg-[#0b0b0b] p-3 text-left transition hover:border-orange-500/50 hover:bg-[#141414] disabled:cursor-not-allowed disabled:opacity-60",
                          isSelected && "border-orange-500/70 bg-[#17110d]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            {example.label}
                          </span>
                          <PlainTag
                            tone={
                              example.expectedOutcome === "PASSED"
                                ? "green"
                                : "muted"
                            }
                          >
                            {example.expectedOutcome}
                          </PlainTag>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                          {example.description}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <Button
                type="button"
                variant={props.selectedExampleId ? "secondary" : "default"}
                size="sm"
                onClick={props.onStartCustom}
                className="mt-3 w-full justify-start"
              >
                <FileJson className="h-4 w-4" />
                Manual entry
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scenario">Scenario</Label>
              {selectedExample ? (
                <div className="border border-[var(--border)] bg-[#101010] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--muted-2)]">
                      Expected outcome
                    </span>
                    <PlainTag
                      tone={
                        selectedExample.expectedOutcome === "PASSED"
                          ? "green"
                          : "muted"
                      }
                    >
                      {selectedExample.expectedOutcome}
                    </PlainTag>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    {selectedExample.description}
                  </p>
                </div>
              ) : (
                <div
                  id="scenario"
                  className="border border-dashed border-[var(--border)] bg-[#0b0b0b] p-3 text-xs leading-5 text-[var(--muted)]"
                >
                  Manual workflow
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="border border-[var(--border)] bg-[#101010] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--foreground)]">
                  Edit Request
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Adjust the current scrape actions and run the trace again.
                </p>
              </div>
              <PlainTag tone={validationTone}>
                {props.validation.isReady ? "Ready" : "Needs Fix"}
              </PlainTag>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={props.url}
            onChange={(event) => props.onUrlChange(event.target.value)}
            placeholder="https://example.com"
            aria-invalid={Boolean(props.validation.fields.url)}
          />
          <FieldError message={props.validation.fields.url} />
        </div>

        <details
          className="border border-[var(--border)] bg-[#101010]"
          open={props.hasReport || !selectedExample}
        >
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[var(--muted-2)]">
            Request Payload
          </summary>
          <div className="space-y-3 border-t border-[var(--border)] p-3">
            <div className="space-y-2">
              <Label htmlFor="actions">Actions JSON</Label>
              <Textarea
                id="actions"
                value={props.actionsJson}
                onChange={(event) => props.onActionsChange(event.target.value)}
                spellCheck={false}
                placeholder={'[\n  { "type": "wait", "selector": "#ready" }\n]'}
                aria-invalid={Boolean(props.validation.fields.actions)}
                className="h-56 resize-y font-mono text-xs leading-5"
              />
              <FieldError message={props.validation.fields.actions} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checks">Checks JSON</Label>
              <Textarea
                id="checks"
                value={props.checksJson}
                onChange={(event) => props.onChecksChange(event.target.value)}
                spellCheck={false}
                placeholder={'[\n  { "type": "selector_exists", "selector": "#ready" }\n]'}
                aria-invalid={Boolean(props.validation.fields.checks)}
                className="h-28 resize-y font-mono text-xs leading-5"
              />
              <FieldError message={props.validation.fields.checks} />
            </div>
          </div>
        </details>

        <details className="border border-[var(--border)] bg-[#101010]">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-[var(--muted-2)]">
            Firecrawl Options
          </summary>
          <div className="space-y-3 border-t border-[var(--border)] p-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Wait for">
                <Input
                  type="number"
                  value={props.firecrawl.waitFor}
                  onChange={(event) =>
                    props.onFirecrawlChange({
                      ...props.firecrawl,
                      waitFor: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Timeout">
                <Input
                  type="number"
                  value={props.firecrawl.timeout}
                  onChange={(event) =>
                    props.onFirecrawlChange({
                      ...props.firecrawl,
                      timeout: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Proxy">
                <select
                  value={props.firecrawl.proxy}
                  onChange={(event) =>
                    props.onFirecrawlChange({
                      ...props.firecrawl,
                      proxy: event.target.value,
                    })
                  }
                  className="h-9 w-full rounded-[5px] border border-[var(--border)] bg-[#101010] px-3 text-sm outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="auto">auto</option>
                  <option value="basic">basic</option>
                  <option value="stealth">stealth</option>
                </select>
              </Field>
              <Field label="Country">
                <Input
                  value={props.firecrawl.location.country}
                  maxLength={2}
                  onChange={(event) =>
                    props.onFirecrawlChange({
                      ...props.firecrawl,
                      location: { country: event.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <FieldError message={props.validation.fields.firecrawl} />

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 rounded-[5px] border border-[var(--border)] bg-[#101010] px-3 py-2 text-xs text-[var(--muted-2)]">
                <input
                  type="checkbox"
                  checked={props.firecrawl.mobile}
                  onChange={(event) =>
                    props.onFirecrawlChange({
                      ...props.firecrawl,
                      mobile: event.target.checked,
                    })
                  }
                  className="accent-[var(--accent)]"
                />
                Mobile
              </label>
              <label className="flex items-center gap-2 rounded-[5px] border border-[var(--border)] bg-[#101010] px-3 py-2 text-xs text-[var(--muted-2)]">
                <input
                  type="checkbox"
                  checked={props.firecrawl.onlyMainContent}
                  onChange={(event) =>
                    props.onFirecrawlChange({
                      ...props.firecrawl,
                      onlyMainContent: event.target.checked,
                    })
                  }
                  className="accent-[var(--accent)]"
                />
                Main Content
              </label>
            </div>

            <Field label="Profile">
              <Input
                value={props.firecrawl.profile.name}
                onChange={(event) =>
                  props.onFirecrawlChange({
                    ...props.firecrawl,
                    profile: { name: event.target.value },
                  })
                }
              />
            </Field>
          </div>
        </details>

        <ValidationSummary validation={props.validation} />

        {props.error ? (
          <div className="border border-red-500/35 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
            {props.error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ValidationSummary({
  validation,
}: {
  validation: TraceSetupValidation;
}) {
  if (validation.isReady) {
    return (
      <div className="flex items-center gap-2 border border-green-500/25 bg-green-500/10 p-3 text-xs leading-5 text-green-100">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Trace setup is ready.
      </div>
    );
  }

  return (
    <div className="border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs leading-5 text-yellow-100">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Complete setup before running.
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {validation.issues.slice(0, 3).map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="text-xs leading-5 text-yellow-100">{message}</p>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

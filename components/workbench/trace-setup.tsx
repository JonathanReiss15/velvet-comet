import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BracketTag } from "@/components/workbench/primitives";
import type { Example, FirecrawlFormState } from "@/components/workbench/types";

export function TraceSetup(props: {
  examples: Example[];
  selectedExampleId: string | null;
  url: string;
  actionsJson: string;
  checksJson: string;
  firecrawl: FirecrawlFormState;
  isRunning: boolean;
  error: string | null;
  onLoadExample: (example: Example) => void;
  onUrlChange: (value: string) => void;
  onActionsChange: (value: string) => void;
  onChecksChange: (value: string) => void;
  onFirecrawlChange: (value: FirecrawlFormState) => void;
  onRun: () => void;
}) {
  const selectedExample = props.examples.find(
    (example) => example.id === props.selectedExampleId,
  );

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
          <Button
            data-testid="run-trace"
            onClick={props.onRun}
            disabled={props.isRunning}
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
      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="scenario">Scenario</Label>
          <select
            id="scenario"
            value={selectedExample?.id ?? ""}
            onChange={(event) => {
              const example = props.examples.find(
                (item) => item.id === event.target.value,
              );
              if (example) props.onLoadExample(example);
            }}
            className="h-9 w-full rounded-[5px] border border-[var(--border)] bg-[#101010] px-3 text-sm outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">Custom workflow</option>
            {props.examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.label}
              </option>
            ))}
          </select>
          {selectedExample ? (
            <div className="border border-[var(--border)] bg-[#101010] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--muted-2)]">
                  Expected diagnosis
                </span>
                <BracketTag>{selectedExample.expectedDiagnosis}</BracketTag>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                {selectedExample.description}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={props.url}
            onChange={(event) => props.onUrlChange(event.target.value)}
          />
        </div>

        <details className="border border-[var(--border)] bg-[#101010]">
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

        {props.error ? (
          <div className="border border-red-500/35 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
            {props.error}
          </div>
        ) : null}
      </div>
    </section>
  );
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

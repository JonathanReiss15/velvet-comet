import type { FirecrawlFormState } from "@/components/workbench/types";
import {
  normalizeActions,
  TraceRequestInputSchema,
  type TraceRequestInput,
} from "@/lib/trace-schema";

export type TraceSetupField = "url" | "actions" | "checks" | "firecrawl";

export type TraceSetupValidation = {
  isReady: boolean;
  issues: string[];
  fields: Partial<Record<TraceSetupField, string>>;
  payload: TraceRequestInput | null;
};

type TraceSetupForm = {
  selectedExampleId: string | null;
  url: string;
  actionsJson: string;
  checksJson: string;
  firecrawl: FirecrawlFormState;
};

export function validateTraceSetup(
  form: TraceSetupForm,
): TraceSetupValidation {
  const issues: string[] = [];
  const fields: TraceSetupValidation["fields"] = {};

  const addIssue = (field: TraceSetupField, message: string) => {
    issues.push(message);
    fields[field] ??= message;
  };

  const url = form.url.trim();
  if (!url) {
    addIssue("url", "Enter a page URL.");
  }

  const actions = parseJsonArray(form.actionsJson, "Actions JSON");
  if (!actions.ok) {
    addIssue("actions", actions.message);
  } else if (actions.value.length === 0) {
    addIssue("actions", "Add at least one action.");
  }

  const checks = parseJsonArray(
    form.checksJson.trim() ? form.checksJson : "[]",
    "Checks JSON",
  );
  if (!checks.ok) {
    addIssue("checks", checks.message);
  }

  const country = form.firecrawl.location.country.trim();
  if (country && !/^[a-z]{2}$/i.test(country)) {
    addIssue("firecrawl", "Country must be a two-letter code.");
  }

  const payloadCandidate = {
    mode: "live",
    exampleId: form.selectedExampleId ?? undefined,
    url,
    actions: actions.ok ? actions.value : [],
    checks: checks.ok ? checks.value : [],
    firecrawl: {
      waitFor: Number(form.firecrawl.waitFor),
      timeout: Number(form.firecrawl.timeout),
      mobile: Boolean(form.firecrawl.mobile),
      proxy: form.firecrawl.proxy,
      onlyMainContent: Boolean(form.firecrawl.onlyMainContent),
      ...(country ? { location: { country: country.toUpperCase() } } : {}),
      ...(form.firecrawl.profile.name.trim()
        ? { profile: { name: form.firecrawl.profile.name.trim() } }
        : {}),
    },
  };

  const parsed =
    issues.length === 0
      ? TraceRequestInputSchema.safeParse(payloadCandidate)
      : null;

  if (parsed && !parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldFromPath(issue.path);
      addIssue(field, formatSchemaIssue(issue.path, issue.message));
    }
  }

  if (parsed?.success) {
    try {
      normalizeActions(parsed.data.actions);
    } catch (error) {
      addIssue(
        "actions",
        error instanceof Error ? error.message : "Actions are not supported.",
      );
    }
  }

  return {
    isReady: issues.length === 0,
    issues,
    fields,
    payload: issues.length === 0 && parsed?.success ? parsed.data : null,
  };
}

function parseJsonArray(
  value: string,
  label: string,
): { ok: true; value: unknown[] } | { ok: false; message: string } {
  if (!value.trim()) {
    return { ok: false, message: `${label} is required.` };
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return { ok: false, message: `${label} must be an array.` };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, message: `${label} must be valid JSON.` };
  }
}

function fieldFromPath(path: (string | number)[]): TraceSetupField {
  const [root] = path;
  if (root === "url") return "url";
  if (root === "actions") return "actions";
  if (root === "checks") return "checks";
  return "firecrawl";
}

function formatSchemaIssue(path: (string | number)[], message: string) {
  return path.length ? `${path.join(".")}: ${message}` : message;
}

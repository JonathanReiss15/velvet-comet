import type { TraceReport } from "@/lib/trace-schema";

export type Example = {
  id: string;
  label: string;
  description: string;
  url: string;
  actions: Array<Record<string, unknown>>;
  checks: Array<Record<string, unknown>>;
  expectedDiagnosis: string;
};

export type ExamplesResponse = {
  recordedTrace: TraceReport;
  examples: Example[];
};

export type FirecrawlFormState = {
  waitFor: number;
  timeout: number;
  mobile: boolean;
  proxy: string;
  onlyMainContent: boolean;
  location: {
    country: string;
  };
  profile: {
    name: string;
  };
};

import type { Diagnosis, TraceReport, TraceStep } from "@/lib/trace-schema";

export type TraceStreamEvent =
  | { type: "trace.started"; report: TraceReport }
  | { type: "step.started"; step: TraceStep }
  | {
      type: "step.completed";
      step: TraceStep;
      summary: TraceReport["summary"];
    }
  | {
      type: "step.failed";
      step: TraceStep;
      diagnosis: Diagnosis;
      failedStepIndex: number;
      summary: TraceReport["summary"];
    }
  | { type: "steps.skipped"; steps: TraceStep[] }
  | { type: "trace.completed"; report: TraceReport }
  | { type: "trace.error"; error: string };

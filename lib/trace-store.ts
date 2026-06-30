import type { TraceReport } from "@/lib/trace-schema";
import { recordedTrace } from "@/lib/recorded-trace";

const globalForTraces = globalThis as typeof globalThis & {
  __actionTraceStore?: Map<string, TraceReport>;
};

const store = globalForTraces.__actionTraceStore ?? new Map<string, TraceReport>();
globalForTraces.__actionTraceStore = store;
store.set(recordedTrace.id, recordedTrace);

export function saveTrace(report: TraceReport) {
  store.set(report.id, report);
  return report;
}

export function getTrace(id: string) {
  return store.get(id) ?? null;
}

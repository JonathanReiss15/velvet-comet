import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number | null | undefined) {
  if (ms == null || Number.isNaN(ms)) return "n/a";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

export function summarizeAction(action: { type?: string; selector?: string; text?: string; key?: string; milliseconds?: number }) {
  if (!action?.type) return "Unknown action";
  if (action.selector) return `${action.type} ${action.selector}`;
  if (action.text) return `${action.type} "${action.text.slice(0, 36)}"`;
  if (action.key) return `${action.type} ${action.key}`;
  if (action.milliseconds != null) return `${action.type} ${action.milliseconds}ms`;
  return action.type;
}

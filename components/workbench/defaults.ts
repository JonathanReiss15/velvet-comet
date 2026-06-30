import type { FirecrawlFormState } from "@/components/workbench/types";

export const defaultActions = JSON.stringify(
  [
    { type: "wait", selector: ".product_pod" },
    { type: "click", selector: ".product_pod h3 a" },
    { type: "wait", milliseconds: 500 },
    { type: "click", selector: "[data-testid='export-table']" },
  ],
  null,
  2,
);

export const defaultChecks = JSON.stringify(
  [{ type: "selector_exists", selector: "[data-testid='export-table']" }],
  null,
  2,
);

export const defaultFirecrawl: FirecrawlFormState = {
  waitFor: 500,
  timeout: 30000,
  mobile: false,
  proxy: "auto",
  onlyMainContent: true,
  location: {
    country: "",
  },
  profile: {
    name: "",
  },
};

import { NextResponse } from "next/server";
import { defaultFirecrawlOptions, examples } from "@/lib/examples";
import { recordedTrace } from "@/lib/recorded-trace";

export async function GET() {
  return NextResponse.json({
    recordedTrace,
    examples: examples.map((example) => ({
      ...example,
      payload: {
        mode: "live",
        exampleId: example.id,
        url: example.url,
        actions: example.actions,
        checks: example.checks,
        firecrawl: defaultFirecrawlOptions
      }
    }))
  });
}

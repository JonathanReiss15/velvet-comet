import { NextResponse } from "next/server";
import { defaultFirecrawlOptions, examples } from "@/lib/examples";

export async function GET() {
  return NextResponse.json({
    examples: examples.map((example) => ({
      ...example,
      payload: {
        mode: "fixture",
        exampleId: example.id,
        url: example.url,
        actions: example.actions,
        checks: example.checks,
        firecrawl: defaultFirecrawlOptions
      }
    }))
  });
}

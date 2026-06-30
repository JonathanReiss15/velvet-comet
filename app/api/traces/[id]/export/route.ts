import { NextResponse } from "next/server";
import {
  redactTraceReport,
  traceToMarkdown,
  traceToSupportSummary,
} from "@/lib/report-export";
import { getTrace } from "@/lib/trace-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const report = getTrace(id);
  if (!report) {
    return NextResponse.json({ error: "Trace not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const redacted = url.searchParams.get("redacted") === "true";

  if (format === "markdown") {
    return new NextResponse(traceToMarkdown(report, { redacted }), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}${redacted ? "-redacted" : ""}.md"`,
      },
    });
  }

  if (format === "support") {
    return new NextResponse(traceToSupportSummary(report, { redacted }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}${redacted ? "-redacted" : ""}-support.txt"`,
      },
    });
  }

  return new NextResponse(
    JSON.stringify(redacted ? redactTraceReport(report) : report, null, 2),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}${redacted ? "-redacted" : ""}.json"`,
      },
    },
  );
}

import { NextResponse } from "next/server";
import { traceToMarkdown } from "@/lib/report-export";
import { getTrace } from "@/lib/trace-store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const report = getTrace(id);
  if (!report) {
    return NextResponse.json({ error: "Trace not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";

  if (format === "markdown") {
    return new NextResponse(traceToMarkdown(report), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}.md"`
      }
    });
  }

  return new NextResponse(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id}.json"`
    }
  });
}

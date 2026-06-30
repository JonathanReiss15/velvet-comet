import { NextResponse } from "next/server";
import { getTrace } from "@/lib/trace-store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const report = getTrace(id);
  if (!report) {
    return NextResponse.json({ error: "Trace not found." }, { status: 404 });
  }
  return NextResponse.json(report);
}

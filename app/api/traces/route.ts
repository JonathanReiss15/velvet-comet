import { NextResponse } from "next/server";
import { runTrace } from "@/lib/trace-runner";
import { saveTrace } from "@/lib/trace-store";
import { TraceRequestInputSchema } from "@/lib/trace-schema";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = TraceRequestInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Trace request failed validation.",
        issues: parsed.error.issues
      },
      { status: 400 }
    );
  }

  const report = await runTrace(parsed.data);
  saveTrace(report);
  return NextResponse.json(report);
}

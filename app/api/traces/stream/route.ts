import { NextResponse } from "next/server";
import type { TraceStreamEvent } from "@/lib/trace-events";
import { runTraceWithEvents } from "@/lib/trace-runner";
import { saveTrace } from "@/lib/trace-store";
import { TraceRequestInputSchema } from "@/lib/trace-schema";

const encoder = new TextEncoder();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = TraceRequestInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Trace request failed validation.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: TraceStreamEvent) => {
        controller.enqueue(encoder.encode(serializeSseEvent(event)));
      };

      try {
        const report = await runTraceWithEvents(parsed.data, send, {
          signal: request.signal,
        });
        saveTrace(report);
      } catch (error) {
        if (isAbortError(error) || request.signal.aborted) return;
        send({
          type: "trace.error",
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        try {
          controller.close();
        } catch {
          // The client may have already disconnected after aborting the run.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function serializeSseEvent(event: TraceStreamEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

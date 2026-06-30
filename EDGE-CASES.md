# Edge Cases To Handle Later

- `write` actions depend on the currently focused element; warn when a write is not preceded by a click/focus-like action.
- Checks need explicit timing. `url_matches` is useful after every navigation-capable step, but `selector_exists` can be premature before the final setup step.
- Screenshots and text excerpts may contain credentials or customer data; any production trace store needs redaction and retention controls.
- Export URLs depend on the in-memory trace store; production needs durable trace IDs so a report survives process restarts and deployments.
- Live Interact responses may expose returned values, stdout, or structured result fields differently; keep snapshot parsing defensive and surface raw evidence when parsing fails.
- The live Interact endpoint can behave like a REPL for generated code; production needs a confirmed async execution contract so translated Playwright actions are awaited reliably.
- Narrow demo viewports can bury the trace results below setup controls; keep the latest outcome and failed-step timeline above the request editor after a run.
- Demo and automated QA text checks can accidentally match navigation labels or example metadata instead of trace results; critical actions and result assertions need stable IDs or result-scoped selectors.

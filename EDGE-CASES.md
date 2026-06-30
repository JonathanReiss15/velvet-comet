# Edge Cases To Handle Later

- `write` actions depend on the currently focused element; warn when a write is not preceded by a click/focus-like action.
- Checks need explicit timing. `url_matches` is useful after every navigation-capable step, but `selector_exists` can be premature before the final setup step.
- Screenshots and text excerpts may contain credentials or customer data; any production trace store needs redaction and retention controls.
- Fixture mode must remain the default demo path because public test pages and anti-bot behavior can change independently of the app.
- Export URLs depend on the in-memory trace store; production needs durable trace IDs so a report survives process restarts and deployments.
- Live Interact responses may expose returned values, stdout, or structured result fields differently; keep snapshot parsing defensive and surface raw evidence when parsing fails.
- The live Interact endpoint can behave like a REPL for generated code; production needs a confirmed async execution contract so translated Playwright actions are awaited reliably.

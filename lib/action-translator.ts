import type { FirecrawlAction } from "@/lib/trace-schema";

type Translation = {
  actionCode: string;
  warnings: string[];
};

const quote = (value: unknown) => JSON.stringify(value);

export function translateActionToPlaywright(action: FirecrawlAction): Translation {
  const warnings: string[] = [];

  switch (action.type) {
    case "wait":
      if (action.selector) {
        return {
          actionCode: `await page.waitForSelector(${quote(action.selector)}, { timeout: stepTimeoutMs });`,
          warnings
        };
      }
      return {
        actionCode: `await page.waitForTimeout(${Math.min(action.milliseconds ?? 500, 60000)});`,
        warnings
      };
    case "click":
      return {
        actionCode: `await page.click(${quote(action.selector)}, { timeout: stepTimeoutMs });`,
        warnings
      };
    case "write":
      warnings.push("write action uses the current focused element; add a click/focus action before it when tracing typed input.");
      return {
        actionCode: `await page.keyboard.type(${quote(action.text)});`,
        warnings
      };
    case "fill":
      return {
        actionCode: `await page.fill(${quote(action.selector)}, ${quote(action.text)}, { timeout: stepTimeoutMs });`,
        warnings
      };
    case "press":
      return {
        actionCode: `await page.keyboard.press(${quote(action.key)});`,
        warnings
      };
    case "scroll": {
      const amount = action.amount ?? 700;
      if (action.selector) {
        return {
          actionCode: `await page.locator(${quote(action.selector)}).scrollIntoViewIfNeeded({ timeout: stepTimeoutMs });`,
          warnings
        };
      }
      const delta =
        action.direction === "up"
          ? `{ x: 0, y: -${amount} }`
          : action.direction === "left"
            ? `{ x: -${amount}, y: 0 }`
            : action.direction === "right"
              ? `{ x: ${amount}, y: 0 }`
              : `{ x: 0, y: ${amount} }`;
      return {
        actionCode: `await page.mouse.wheel(${delta});`,
        warnings
      };
    }
    case "screenshot":
      return {
        actionCode: `await page.screenshot({ fullPage: ${Boolean(action.fullPage)} });`,
        warnings
      };
    case "executeJavascript": {
      const code = action.code ?? action.script ?? "";
      return {
        actionCode: `await page.evaluate(${quote(code)});`,
        warnings
      };
    }
  }

  throw new Error(`Unsupported action: ${JSON.stringify(action)}`);
}

export function generateInteractCode(action: FirecrawlAction, stepTimeoutMs: number) {
  const translation = translateActionToPlaywright(action);
  const code = `
const startedAt = Date.now();
const stepTimeoutMs = ${Math.max(1000, Math.min(stepTimeoutMs, 60000))};
async function snapshot(ok, errorMessage) {
  const title = await page.title().catch(() => "");
  const url = page.url();
  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const screenshot = await page.screenshot({ fullPage: false }).catch(() => null);
  const payload = {
    ok,
    durationMs: Date.now() - startedAt,
    url,
    title,
    textExcerpt: bodyText.slice(0, 1200),
    screenshotBase64: screenshot ? screenshot.toString("base64") : undefined,
    error: errorMessage
  };
  console.log(JSON.stringify({ __actionTraceSnapshot: payload }));
  return JSON.stringify(payload);
}
try {
  ${translation.actionCode}
  await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
  return await snapshot(true);
} catch (error) {
  return await snapshot(false, error && error.message ? error.message : String(error));
}
`.trim();

  return {
    code,
    warnings: translation.warnings
  };
}

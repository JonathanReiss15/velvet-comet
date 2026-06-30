export function screenshotSrc(source: string) {
  const trimmed = source.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const mime = inferBase64ImageMime(trimmed);
  return `data:${mime};base64,${trimmed}`;
}

function inferBase64ImageMime(value: string) {
  if (value.startsWith("PHN2Zy")) return "image/svg+xml";
  if (value.startsWith("iVBORw0KGgo")) return "image/png";
  if (value.startsWith("/9j/")) return "image/jpeg";
  if (value.startsWith("UklGR")) return "image/webp";
  if (value.startsWith("R0lGOD")) return "image/gif";
  return "image/png";
}

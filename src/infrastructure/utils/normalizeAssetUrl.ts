// A handful of stored R2 asset URLs are missing their scheme (e.g.
// "instabucket.ascurra-soluciones.com/..." instead of "https://instabucket...."). Left as-is,
// this breaks whatever consumes the URL: OpenAI's batch API rejects it outright when asked to
// fetch it, and a browser <img>/iframe treats it as a relative path and silently fails to load.
// Repair it defensively wherever a stored URL is about to be used, rather than requiring a
// one-off DB migration to fix already-persisted rows.
export function normalizeAssetUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

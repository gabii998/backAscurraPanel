export function extractHtmlVariables(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
}

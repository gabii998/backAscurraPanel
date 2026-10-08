export interface ProjectColumn { id: string; label: string; color: string }

export const DEFAULT_PROJECT_COLUMNS: ProjectColumn[] = [
  { id: "backlog", label: "Backlog", color: "#94a3b8" },
  { id: "progress", label: "En progreso", color: "#3b82f6" },
  { id: "review", label: "En revisión", color: "#f59e0b" },
  { id: "done", label: "Completado", color: "#22c55e" },
];

export function validateProjectColumns(value: unknown): ProjectColumn[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) throw new Error("INVALID_PROJECT_COLUMNS");
  const ids = new Set<string>();
  const columns = value.map(column => {
    if (!column || typeof column.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(column.id) || ids.has(column.id) ||
        typeof column.label !== "string" || !column.label.trim() || column.label.trim().length > 80 ||
        typeof column.color !== "string" || !/^#[a-fA-F0-9]{6}$/.test(column.color)) throw new Error("INVALID_PROJECT_COLUMNS");
    ids.add(column.id);
    return { id: column.id, label: column.label.trim(), color: column.color };
  });
  if (!ids.has("done")) throw new Error("COMPLETED_COLUMN_REQUIRED");
  return columns;
}

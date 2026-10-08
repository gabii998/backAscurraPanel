ALTER TABLE "Project" ADD COLUMN "columns" JSONB NOT NULL DEFAULT '[{"id":"backlog","label":"Backlog","color":"#94a3b8"},{"id":"progress","label":"En progreso","color":"#3b82f6"},{"id":"review","label":"En revisión","color":"#f59e0b"},{"id":"done","label":"Completado","color":"#22c55e"}]';
ALTER TABLE "Task" ALTER COLUMN "column" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "column" TYPE TEXT USING "column"::text;
ALTER TABLE "Task" ALTER COLUMN "column" SET DEFAULT 'backlog';
DROP TYPE "Column";

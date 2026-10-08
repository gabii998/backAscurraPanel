# Proyectos y tareas

**Leer cuando:** CRUD de proyectos, asignación de miembros, o tareas Kanban (prioridad, columna, subtareas, asignado).

_Todavía no documentado en detalle — leer `ProjectController.ts`, `TaskController.ts` y los casos de uso `CreateProject`, `GetProject`, `ListProjects`, `UpdateProject`, `DeleteProject`, `CreateTask`, `UpdateTask`, `DeleteTask`, `ListTasksByProject` como fuente de verdad hasta completar este documento._

Los proyectos guardan su lista ordenada de columnas en `Project.columns`, con identificadores estables, nombre y color hexadecimal. Los proyectos existentes y nuevos reciben Backlog, En progreso, En revisión y Completado. `PUT /projects/:id` permite reemplazar la lista: admite de 1 a 20 columnas, IDs únicos de hasta 64 caracteres (letras, números, guion y guion bajo), nombres no vacíos de hasta 80 caracteres y colores `#RRGGBB`. La columna `done` debe conservarse para mantener las métricas de tareas completadas, aunque puede cambiar su nombre, color y posición. Eliminar una columna con tareas activas devuelve 409 `COLUMN_HAS_TASKS`; primero hay que mover esas tareas.

Las tareas guardan el ID de columna como texto. Al crear o mover una tarea, el backend valida que la columna pertenezca a su proyecto (400 `INVALID_TASK_COLUMN`); sin columna explícita, la creación elige la primera configurada. La migración conserva los IDs anteriores y todas las tareas.

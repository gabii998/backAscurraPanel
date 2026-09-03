# Portfolio (proyectos del landing)

**Leer cuando:** `PortfolioProjectController`, el modelo `PortfolioProject`, o por qué el landing público de `ascurraPanel` muestra o no un proyecto.

**También leer:** [portfolio.md](../../ascurraPanel/docs/portfolio.md) del frontend para el lado del panel; [marca-instagram.md](marca-instagram.md) para el patrón de subida a R2 que este dominio replica.

`PortfolioProject` es el contenido de la sección "Trabajo seleccionado" del sitio público de `ascurraPanel` (componente `work` del landing) — no tiene relación con el modelo `Project` (que es el Kanban interno de gestión de proyectos). Cada fila tiene `tag`, `title`, `description`, `tech[]`, y una imagen propia en R2 (`imageUrl`/`objectKey`).

## Endpoints y visibilidad

`GET /portfolio-projects` es público (sin `authMiddleware`) porque el landing lo consume sin sesión iniciada; el resto (`POST`, `PUT`, `DELETE`, `PATCH /reorder`) requiere `authMiddleware` pero no un rol específico — cualquier usuario autenticado del panel puede gestionar el portfolio, igual que `clientRoutes.ts`. No existe un estado publicado/borrador: todo lo que se crea vía `POST` aparece de inmediato en el `GET` público.

## Orden manual

El orden de aparición en el landing es `sortOrder asc`. No hay un endpoint de "mover uno" — `ReorderPortfolioProjects` recibe el array completo de ids en el orden deseado y reescribe `sortOrder = index` para todos en una única `prisma.$transaction`. El panel arma ese array completo en el cliente (swap local) antes de llamar al endpoint; esto evita lógica de reordenamiento (cálculo de gaps, swaps) del lado del servidor.

## Imagen y hard delete

Igual que `IgExamplePost`, la imagen sube a R2 vía `multer` en memoria + `R2Storage.put`, con `objectKey` con patrón `portfolio/{id}/{uuid}.{ext}`. `PortfolioProject` **no tiene `deletedAt`** — es hard delete deliberado (ver `DATABASE_PATTERNS.md`): al borrar, `DeletePortfolioProject` borra primero el objeto en R2 y después la fila, así no queda un objeto huérfano en el bucket. Al editar con una imagen nueva, `UpdatePortfolioProject` sube el objeto nuevo, actualiza la fila, y sólo después borra el objeto viejo (best-effort) — nunca al revés, para no perder la imagen si el `update` de la fila fallara.

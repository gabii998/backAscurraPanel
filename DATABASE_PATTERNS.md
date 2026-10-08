# Patrones de base de datos

Fuente de verdad de las convenciones de Prisma y PostgreSQL de `backAscurraPanel` — no una guía genérica de Prisma. No dupliques esta descripción en otros documentos.

## Identificadores

Los ids son `String @id @default(uuid())` en todos los modelos. Única excepción: `Workspace.inviteToken`, que usa `@default(cuid())` porque es un token de invitación, no un identificador de fila.

## Timestamps

`createdAt DateTime @default(now())` en todos los modelos. `updatedAt DateTime @updatedAt` sólo donde el modelo se actualiza después de creado (`Workspace`, `Project`, y la mayoría de las configs de integración — MercadoPago, ARCA, WhatsApp, Mail). Modelos que son esencialmente append-only (logs, eventos) no lo tienen.

## Baja lógica (soft delete)

`deletedAt DateTime?` existe hoy en exactamente 5 modelos: `User`, `Project`, `Task`, `Client`, `AppError`. **No es universal** — el resto de los modelos hace hard delete. Antes de asumir que un modelo soporta baja lógica, verificá el schema; no lo des por sentado por analogía con otro dominio.

Un modelo dueño de un archivo externo (R2) — como `IgExamplePost` o `PortfolioProject` — hace hard delete deliberadamente: no hay valor en retener el registro sin su archivo, y mantener soft delete obligaría a decidir por separado cuándo borrar el objeto en R2. Al borrar, el caso de uso borra primero el objeto en R2 y recién después la fila.

## Multi-tenancy

No aplica. No hay campo `workspaceId`/`tenantId` en ningún modelo — `Workspace` es una fila global única de configuración, no un mecanismo de scoping. No hay PostGIS ni columnas geoespaciales en este schema.

## Enums

Definidos junto al modelo que los usa, en `snake_case`/valores en minúscula: `ProjectStatus`, `Priority`, `ClientStatus`, `ErrorSeverity`, `ErrorStatus`, `ProspectStage`, `WhatsAppMessageDirection`, `ContactRequestStatus`, `IgPostStatus`. Si agregás un enum nuevo, seguí la misma convención de nombres en minúscula para los valores.

## Migraciones

`prisma/migrations/` — flujo estándar de Prisma (`prisma migrate dev` en desarrollo, `prisma migrate deploy` en producción, ver script `prisma:deploy` en `package.json`). Hay un diagrama entidad-relación generado en `prisma/erd.mmd`/`erd.png`/`erd.svg` (script `prisma:erd`) — regenerarlo después de cambios grandes de schema es una buena práctica, no un paso obligatorio documentado.

## Repositorios

La gran mayoría de `src/infrastructure/repositories/*.ts` usa el Prisma Client estándar (`prisma.model.findMany(...)`, `.create(...)`, etc.), no SQL crudo.

**Excepción documentada — `$queryRawUnsafe`**: usado hoy en exactamente 2 archivos, `PrismaMercadoPagoConfigRepository.ts` y `PrismaMercadoPagoLogRepository.ts` (ver [docs/mercadopago.md](docs/mercadopago.md)). Es la excepción puntual de ese dominio, no el patrón general del repo — no lo uses como plantilla para un repositorio nuevo salvo que tengas una razón concreta y la documentes ahí mismo.

## Transacciones

El cambio de columnas de un proyecto y la creación o edición de tareas se ejecutan con transacciones serializables. El chequeo de columnas ocupadas y la validación de pertenencia ocurren dentro de esas transacciones, para impedir que una eliminación de columna concurrente deje tareas sin columna válida.

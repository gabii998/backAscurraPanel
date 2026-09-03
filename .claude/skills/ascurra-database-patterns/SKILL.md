---
name: ascurra-database-patterns
description: Use before writing or reviewing a Prisma schema change, migration, or repository query in backAscurraPanel — applies this codebase's real conventions for ids, timestamps, soft delete, and raw SQL from DATABASE_PATTERNS.md instead of generic Prisma defaults.
---

# Convenciones de base de datos de Ascurra Soluciones

Fuente completa: `DATABASE_PATTERNS.md` en la raíz de `backAscurraPanel` (o su copia sincronizada en `ascurraPanel`). Leelo antes de tocar `prisma/schema.prisma` o un repositorio; este skill resume cómo aplicarlo.

## Al agregar un modelo

- Id: `String @id @default(uuid())`. No inventes otro esquema de id salvo un caso muy puntual (la única excepción hoy es un token, no un id de fila).
- `createdAt DateTime @default(now())` siempre. `updatedAt DateTime @updatedAt` sólo si el modelo se actualiza después de creado.
- `deletedAt DateTime?` (soft delete) sólo si el dominio realmente lo necesita — **no es el default**. Hoy sólo lo tienen `User`, `Project`, `Task`, `Client`, `AppError`. Si tu modelo nuevo necesita baja lógica, agregalo explícitamente y documentá el motivo en `DATABASE_PATTERNS.md`.
- No hay multi-tenancy en este schema — no agregues `workspaceId`/`tenantId` salvo que el usuario lo pida explícitamente como cambio de arquitectura.

## Al escribir un repositorio

- Usá el Prisma Client estándar (`prisma.model.findMany/create/update/...`) — es la norma en casi todo el repo.
- `$queryRawUnsafe` es la excepción, no el default: hoy sólo se usa en el dominio MercadoPago (`PrismaMercadoPagoConfigRepository.ts`, `PrismaMercadoPagoLogRepository.ts`). No lo copies para un repositorio nuevo salvo que tengas una razón concreta (documentala en `DATABASE_PATTERNS.md` si la agregás).

## Antes de terminar

Si tu cambio introduce una convención de datos nueva o reinterpreta una existente, actualizá `DATABASE_PATTERNS.md` en la misma entrega — seguí el flujo de `ascurra-backend-knowledge-maintenance`.

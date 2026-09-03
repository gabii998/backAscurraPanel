---
name: ascurra-backend-knowledge-maintenance
description: Use after any change to backAscurraPanel that adds or modifies a business rule, endpoint, or architectural convention — decides whether AGENTS.md, docs/*.md, BACKEND_ARCHITECTURE.md, or DATABASE_PATTERNS.md needs updating, and how, before the change is considered done.
---

# Mantenimiento del conocimiento del backend

Corré esto antes de dar por terminado cualquier cambio en `backAscurraPanel` que:
- agregue, cambie o elimine una regla de negocio observable (qué hace el sistema, no cómo está implementado),
- agregue un dominio/controller/caso de uso nuevo,
- cambie una convención transversal (capas, wiring, auth, manejo de errores, convenciones de Prisma).

## Decidir dónde documentar

- ¿Cambia lo que el sistema hace para el negocio en un dominio puntual (MercadoPago, ARCA, proyectos, etc.)? → el `docs/*.md` de ese dominio. Buscá la fila correspondiente en la tabla `Mapa de carga` de `AGENTS.md`; si el dominio es nuevo, agregá una fila.
- ¿Cambia cómo está armado el sistema en general (capas, wiring, patrón de casos de uso, manejo de errores)? → `BACKEND_ARCHITECTURE.md`.
- ¿Cambia una convención de Prisma/Postgres (soft delete, `$queryRawUnsafe`, enums, migraciones)? → `DATABASE_PATTERNS.md`.
- `AGENTS.md` mismo **nunca** lleva reglas de negocio — sólo la tabla de routing y este mandato de mantenimiento.

## Cómo escribir la entrada

Seguí el formato ya establecido en `docs/*.md`:
- Un único `#` con el nombre del dominio.
- `**Leer cuando:**` inmediatamente después, con los temas gatillo separados por comas.
- `**También leer:**` sólo si hay una dependencia real con otro doc (no lo agregues "por las dudas").
- Prosa en párrafos, no bullets — cada regla en una oración completa, incluyendo las reglas negativas ("X no determina Y") cuando corresponda.
- Referenciá símbolos de código reales (`XController`, `CreateX`) cuando ayude a desambiguar el alcance, pero no conviertas el doc en un recorrido línea por línea del código.
- Una sola fuente de verdad por regla — si otro doc ya la explica, enlazá en vez de repetir.

## Qué no hacer

- No uses los docs como changelog ("se agregó el campo X el 3 de marzo") — describí el comportamiento actual, no la historia de cómo llegó ahí.
- No dejes una regla acordada sólo en esta conversación o en un commit — si no queda en `docs/`, no existe para el próximo agente.
- No documentes cosas que ya se pueden derivar leyendo el código sin ambigüedad (nombres de archivos, estructura de carpetas) — eso vive en `BACKEND_ARCHITECTURE.md` una sola vez, no repetido en cada doc de dominio.

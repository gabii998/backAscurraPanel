---
name: ascurra-backend-patterns
description: Use before writing or reviewing backend code in backAscurraPanel (a new use case, controller, route, or repository) — applies the layering, naming, wiring, and auth conventions from BACKEND_ARCHITECTURE.md so new code matches the existing pattern instead of inventing a new one.
---

# Convenciones de backend de Ascurra Soluciones

Fuente completa: `BACKEND_ARCHITECTURE.md` en la raíz de `backAscurraPanel` (o en `ascurraPanel` si estás trabajando desde ese repo — es una copia sincronizada). Leelo antes de escribir código nuevo; este skill resume cómo aplicarlo.

## Al agregar un caso de uso nuevo

- Una clase por operación en `src/application/use-cases/`, nombrada `Verbo + Entidad` (`CreateX`, `GetX`, `ListX`, `UpdateX`, `DeleteX`; `AssignApiKeyToX`/`UnassignApiKeyFromX` para vínculos M:N; `CheckXBatch(es)` para polling de jobs).
- Inyectá dependencias por constructor, tipadas contra las interfaces de `src/domain/repositories/`, nunca contra la implementación Prisma directamente.
- El caso de uso no importa nada de `express` ni de `@prisma/client` — sólo de `domain/`.

## Al agregar un endpoint nuevo

- Controller en `src/interfaces/http/controllers/XController.ts`, un método `handleY` por endpoint, que traduce `Request`/`Response` a una llamada al caso de uso.
- Rutas en `src/infrastructure/http/express/routes/xRoutes.ts`, exportando `buildXRoutes(controller, authMiddleware, ingestKeyMiddleware)`.
- Registrá cada handler envuelto en `wrapRequestHandler(controller.method.bind(controller))`.
- Elegí el nivel de auth correcto: `authMiddleware` (+ `requireRole("admin")` si aplica) para rutas de panel; `ingestKeyMiddleware` para rutas que llaman proyectos externos; sin middleware sólo para webhooks entrantes de proveedores — y en ese caso, validá con un secreto/firma dentro del caso de uso, no confíes en la ausencia de middleware como si fuera seguro.
- El wiring (instanciar repos → casos de uso → controller → rutas) va a mano en `Server.ts`, sin contenedor de DI.

## Errores

No hay un módulo `ERROR_CODES` centralizado confirmado en este repo. Mapeá el `message` del error lanzado por el caso de uso a un status HTTP dentro del `catch` del controller, siguiendo el patrón que ya usa el resto de los controllers de ese mismo archivo.

## Antes de terminar

Si tu cambio agrega o modifica una regla de negocio, corré el skill `ascurra-backend-knowledge-maintenance`.

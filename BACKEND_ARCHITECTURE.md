# Arquitectura del backend

Fuente de verdad de la arquitectura de capas de `backAscurraPanel`. Describe el patrón real que sigue el código (Clean Architecture con capas manuales, sin contenedor de DI), no una guía genérica de Node/Express. No dupliques esta descripción en otros documentos — enlazá acá.

## Capas y responsabilidades

- `src/domain/` — `entities/` (formas de datos puras), `model/` (DTOs de entrada/salida entre capas) y `repositories/` (interfaces, sin implementación). No importa nada de las otras capas.
- `src/application/use-cases/` — una clase por caso de uso (124 archivos, flat, sin subcarpetas), inyectada por constructor con las interfaces de `domain/repositories`. Contiene la lógica de negocio; no conoce Express ni Prisma directamente.
- `src/infrastructure/` — implementaciones concretas: `repositories/` (Prisma), `services/` (adaptadores a SDKs externos — Mercado Pago, ARCA, WhatsApp, SMTP), `db/` (cliente Prisma), `http/express/` (servidor, rutas, middlewares), `http/swagger/` (spec OpenAPI parcial), `jobs/`, `utils/`.
- `src/interfaces/http/controllers/` — un controller por dominio (21 archivos, flat), traduce `Request`/`Response` a llamadas a casos de uso.

Dirección de imports: `domain` no depende de nada; `application` depende sólo de `domain`; `infrastructure` implementa las interfaces de `domain` y puede depender de `application`; `interfaces` orquesta `application` + `infrastructure`.

## Patrón de casos de uso

Una clase por operación, nombrada `Verbo + Entidad` (`CreateMPPreference`, `ListArcaLogs`, `HandleMPWebhook`). Familias de nombres reales:
- `Create/Get/List/Update/Delete` + entidad, para CRUD estándar.
- `AssignApiKeyToX` / `UnassignApiKeyFromX`, para vínculos M:N con API keys (ARCA, WhatsApp).
- `CheckXBatch(es)`, para polling de jobs asíncronos (batches de Instagram).
- `Synthesize` / `Estimate` / `Generate`, para el pipeline de IA (marca, posts de Instagram).

**Excepción documentada**: `styleReferenceAnalysisPrompt.ts` vive en `application/use-cases/` pero no es un caso de uso — es un template de prompt usado por el pipeline de síntesis de marca. Es deuda de nomenclatura conocida, no lo tomes como ejemplo del patrón.

## Errores

No hay confirmado un módulo tipo `ERROR_CODES` centralizado en este repo (a diferencia de otros proyectos hermanos). El manejo real de errores es por controller: cada método captura excepciones del caso de uso y mapea el `message` del error a un status HTTP puntual (ver cualquier `handleX` en `interfaces/http/controllers/*.ts` como ejemplo). Si al escribir un doc de dominio encontrás un patrón más centralizado, actualizá esta sección.

## Composición (wiring)

Todo el wiring vive en `src/infrastructure/http/express/Server.ts`. Patrón confirmado (ver `mpRoutes.ts` y su registro en `Server.ts`):
- Cada dominio tiene una función `buildXRoutes(controller, authMiddleware, ingestKeyMiddleware)` que arma su `Router` de Express.
- Cada handler se registra envuelto en `wrapRequestHandler(controller.method.bind(controller))`.
- No hay contenedor de inyección de dependencias: `Server.ts` instancia repositorios, casos de uso y controllers a mano, en orden, y los pasa por constructor.

## Auth y trust levels

Tres niveles de confianza conviven, sin mezclarse dentro de una misma ruta:
1. **Sesión JWT** (`authMiddleware`) — rutas del panel/dashboard. `requireRole("admin")` restringe algunas a administradores.
2. **API key** (`ingestKeyMiddleware`, header `x-api-key`) — rutas que llaman proyectos externos o servicios (mail, MercadoPago, ARCA, WhatsApp, ingesta de errores).
3. **Sin autenticación** — webhooks entrantes de proveedores externos (ej. `/mp/webhook/:configName`, `/whatsapp/webhook`). La seguridad ahí depende de otros mecanismos (firma del proveedor, secretos compartidos) documentados en el `docs/*.md` de cada integración, no de este archivo.

## Multi-tenancy

Este backend **no es multi-tenant**. `Workspace` es una única fila de configuración global (nombre, timezone, idioma, token de invitación) — no existe un campo `workspaceId`/`tenantId` en ningún modelo del schema. No asumas scoping por tenant al leer o escribir código nuevo.

## Verificar archivos en R2 (no confiar en la URL pública)

`R2Storage` sirve los objetos vía un dominio público (`CLOUDFLARE_R2_PUBLIC_BASE_URL`) que está detrás de Cloudflare con cache (`Cache-Control: max-age=14400`, 4 horas). Al verificar manualmente que un `delete`/reemplazo funcionó, un `curl` a esa URL pública puede devolver `200` durante horas después del borrado real — es el edge de Cloudflare sirviendo la copia cacheada (`cf-cache-status: HIT`, header `Age` alto), no el estado real del bucket. Pasó al verificar el reemplazo de imagen de `PortfolioProject`: la URL vieja seguía respondiendo 200 mucho después de que `storage.delete()` ya la había borrado.

Para verificar el estado real de un objeto, pegarle al bucket directo con el SDK de S3 (mismas credenciales que usa `R2Storage`, `HeadObjectCommand` contra `CLOUDFLARE_R2_ACCOUNT_ID`/`CLOUDFLARE_R2_BUCKET_NAME`), nunca al dominio público cacheado.

## Convenciones de nombres

- Archivos de caso de uso: `PascalCase.ts`, un export por archivo.
- Controllers: `XController.ts`, un método `handleY` por endpoint.
- Rutas: `xRoutes.ts`, exporta `buildXRoutes(...)`.
- Repositorios Prisma: `PrismaXRepository.ts`, implementa la interfaz `XRepository` de `domain/repositories`.

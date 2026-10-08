# Monitoreo de errores

**Leer cuando:** ingesta de errores (vía API key) de otros proyectos, o gestión de configs de error-tracking (severidad, estado).

_Todavía no documentado en detalle — leer `ErrorController.ts`, `ErrorConfigController.ts` y los casos de uso `IngestError`, `ListErrors`, `GetError`, `UpdateErrorStatus`, `DeleteError`, `CreateErrorConfig`, `ListErrorConfigs`, `GetErrorConfig`, `DeleteErrorConfig`, `FindErrorConfigsByApiKey` como fuente de verdad hasta completar este documento._

`DELETE /error-configs/:id/errors` requiere sesión autenticada y valida que la configuración exista (404 si no existe). Realiza baja lógica de todos sus errores activos por `errorConfigId`, de cualquier severidad o estado, y devuelve `{ clearedCount }`. Conserva la configuración, su API key y los errores de otras configuraciones; repetir la operación devuelve cero si no hay nuevos registros.

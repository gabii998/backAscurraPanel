# Auditoría de requests

**Leer cuando:** el log de auditoría de requests HTTP (quién pegó qué endpoint, cuándo).

_Todavía no documentado en detalle — leer `RequestLogController.ts`, el caso de uso `ListRequestLogs`, y el middleware que puebla este log en `Server.ts` (`buildRequestLoggerMiddleware`) como fuente de verdad hasta completar este documento. A diferencia del resto de los dominios, este no tiene un flujo de escritura basado en casos de uso — se llena automáticamente por middleware global._

`DELETE /request-logs` requiere una sesión autenticada y elimina exclusivamente los registros de `RequestLog`, devolviendo `{ clearedCount }`. No afecta los registros de ARCA ni de MercadoPago. El middleware excluye las consultas y la limpieza de `/request-logs` para evitar que leer el historial genere nuevas entradas y que la limpieza se registre a sí misma. Nuevos requests de otras rutas continúan registrándose después de limpiar.

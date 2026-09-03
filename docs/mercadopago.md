# MercadoPago

**Leer cuando:** creación de preferencias de pago, checkout de MercadoPago, webhooks entrantes de MercadoPago, o por qué un pago no se refleja como aprobado en un proyecto que consume esta API.

**También leer:** [api-keys.md](api-keys.md) para cómo se autentican los proyectos que llaman `/mp/pay`; [DATABASE_PATTERNS.md](../DATABASE_PATTERNS.md) para el uso de `$queryRawUnsafe` en los repositorios de esta config.

Cada proyecto que quiere cobrar con MercadoPago tiene una `MercadoPagoConfig` propia (access token, public key, URL de checkout de retorno, `webhookUrl` del proyecto, y dos secrets distintos — ver más abajo), vinculada a una API key que el proyecto usa para llamar `POST /mp/pay`.

## Creación de preferencia

`CreateMPPreference` arma la preferencia con Mercado Pago y devuelve `checkout_url`/`sandbox_checkout_url`/`preference_id`. Dos detalles no obvios, ambos causa real de fallos de pago encontrados en producción:

- `notification_url` (adónde Mercado Pago nos avisa cambios de estado) se arma como `${API_URL}/mp/webhook/${encodeURIComponent(config.name)}`. El nombre de la config puede tener espacios o corchetes (por ejemplo `[DEV] Erpy`); sin codificar, Mercado Pago rechaza la preferencia con `invalid_notification_url` / "Wrong format".
- `checkout_url` **no siempre es `init_point`**. Si el access token de la config es de prueba (empieza con `TEST-`), se devuelve `sandbox_init_point` en su lugar. Mercado Pago siempre incluye ambos valores en la respuesta, pero usar el de producción con credenciales de prueba hace que el checkout rechace el pago con "una de las partes con la que intentás hacer el pago es de prueba" — el usuario nunca llega a ver un error claro de nuestro lado, sólo el de Mercado Pago.

Los errores que puede tirar el SDK de Mercado Pago (`mercadopago` npm) no son instancias de `Error` — su cliente REST hace `throw await response.json()`, así que lo que se recibe es el objeto de error crudo de la API (`{ message, error, status, cause }`). Si se guarda con `String(err)` sin chequear esto, el log queda con `"[object Object]"` en vez del motivo real. `CreateMPPreference` serializa con `JSON.stringify` cuando el error no es una instancia de `Error`.

## Los dos secrets de webhook

`MercadoPagoConfig` tiene dos campos de secret con propósitos completamente distintos — confundirlos es la causa más común de "el pago se aprobó pero nunca se activó del lado del proyecto":

- **`webhookSecret`** — se manda como header `x-ascurra-webhook-secret` cuando **nosotros** reenviamos la confirmación de pago al `webhookUrl` del proyecto consumidor (`HandleMPWebhook`, tras procesar la notificación de MP). El proyecto consumidor tiene que validar este header contra el mismo valor configurado de su lado — si no coincide, va a rechazar el reenvío (típicamente con 401) y la suscripción/orden nunca se marca como pagada, aunque Mercado Pago sí haya aprobado el cobro.
- **`mercadoPagoWebhookSecret`** — valida la firma que **Mercado Pago** manda hacia nuestro propio endpoint de webhook (`WebhookSignatureValidator` del SDK oficial). Es opt-in: si no está configurado, `HandleMPWebhook` se salta la validación de firma en vez de rechazar todo, para no bloquear pagos reales antes de que alguien complete la configuración del webhook en el panel de developers de Mercado Pago (que es donde se obtiene este secret).

Ambos campos tienen su input en el formulario de config del panel (ver `docs/mercadopago.md` del repo `ascurraPanel`).

## Webhook entrante y conciliación

`HandleMPWebhook` recibe la notificación, valida la firma si `mercadoPagoWebhookSecret` está configurado, busca el pago real en la API de Mercado Pago con `MercadoPagoClient.getPayment(dataId)` (nunca confía en el body del webhook para el estado — siempre re-consulta), actualiza el log local, y reenvía al `webhookUrl` del proyecto con el header `x-ascurra-webhook-secret`.

Si la consulta a Mercado Pago falla durante el procesamiento del webhook, el error se reporta vía `IngestError` (visible en el panel de Errores de `ascurraPanel`) en vez de descartarse en silencio — antes de este cambio, un fallo acá desaparecía sin dejar rastro.

`GetMPPaymentByReference` (usado por el endpoint `GET /mp/payment/by-reference/:externalReference`, que es lo que un consumidor típico llama en su propio job de conciliación periódica) no depende exclusivamente de que el webhook ya haya llegado: si el log local todavía no tiene `paymentId`, busca el pago directo en Mercado Pago vía `MercadoPagoClient.findPaymentByExternalReference` (búsqueda por `external_reference`, `GET /v1/payments/search`) antes de devolver el estado. Esto es lo que hace que la conciliación de un consumidor sea resiliente a un webhook que nunca llegó — sin este fallback, un job de conciliación que sólo relee el log local repetiría "pending" para siempre.

## Contrato con el consumidor

Cualquier proyecto que use esta API para cobrar (no sólo un consumidor en particular) tiene que, del lado suyo: configurar un `webhookSecret` que coincida con el que se cargó acá, y su propio endpoint de recepción de webhook tiene que validarlo antes de aplicar cualquier cambio de estado — de lo contrario ese endpoint queda abierto a que cualquiera simule un pago aprobado. Las reglas específicas de reconciliación del lado de un consumidor viven en la documentación de ese repo, no acá.

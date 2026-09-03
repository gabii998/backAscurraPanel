# Índice de conocimiento del backend

Este archivo es el punto de entrada para agentes (Codex, Claude) que trabajan en `backAscurraPanel`. No cargues todo el repositorio: identificá el dominio afectado y leé sólo el documento correspondiente antes de cambiarlo.

## Mapa de carga

| Si la tarea afecta… | Leer |
|---|---|
| Capas, casos de uso, wiring de rutas o middlewares | [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) |
| Prisma, PostgreSQL, migraciones, transacciones o `$queryRawUnsafe` | [DATABASE_PATTERNS.md](DATABASE_PATTERNS.md) |
| Login, usuarios, sesiones o configuración del workspace | [docs/identidad-usuarios.md](docs/identidad-usuarios.md) |
| Proyectos o tareas (Kanban) | [docs/proyectos-tareas.md](docs/proyectos-tareas.md) |
| Clientes (CRM) | [docs/clientes.md](docs/clientes.md) |
| Portfolio (proyectos del landing público) | [docs/portfolio.md](docs/portfolio.md) |
| Prospección de ventas o el presence-tracker "Companion" | [docs/prospects-crm.md](docs/prospects-crm.md) |
| Ingesta o gestión de errores de otros proyectos | [docs/monitoreo-errores.md](docs/monitoreo-errores.md) |
| Emisión o revocación de API keys | [docs/api-keys.md](docs/api-keys.md) |
| Notificaciones in-app | [docs/notificaciones.md](docs/notificaciones.md) |
| Envío de mail, configuración SMTP o templates | [docs/mail.md](docs/mail.md) |
| MercadoPago: preferencias, checkout, webhooks o conciliación | [docs/mercadopago.md](docs/mercadopago.md) |
| ARCA / facturación electrónica (AFIP) | [docs/arca.md](docs/arca.md) |
| WhatsApp Business | [docs/whatsapp.md](docs/whatsapp.md) |
| Perfiles de marca o generación de posts de Instagram con IA | [docs/marca-instagram.md](docs/marca-instagram.md) |
| Formulario público de contacto | [docs/contacto.md](docs/contacto.md) |
| Auditoría de requests HTTP | [docs/auditoria.md](docs/auditoria.md) |
| Estadísticas del dashboard | [docs/estadisticas.md](docs/estadisticas.md) |

## Mantenimiento

Todo cambio que introduzca o modifique una regla de negocio, o un componente relevante del sistema, tiene que actualizar su documento canónico en la misma entrega. Seguí el flujo del skill `ascurra-backend-knowledge-maintenance` para decidir qué y dónde documentar.

Un cambio de capas, manejo de errores, wiring o convenciones transversales va en `BACKEND_ARCHITECTURE.md`. Un cambio de qué hace el sistema para el negocio va en `docs/`. No dupliques descripciones entre ambos — enlazá al origen canónico.

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Ascurra Soluciones API",
    version: "0.1.0",
    description: "API interna del dashboard y servicios externos (mail, MercadoPago, ARCA).",
  },
  servers: [{ url: "http://localhost:3000", description: "Local" }],

  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      apiKey:     { type: "apiKey", in: "header", name: "x-api-key" },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: { message: { type: "string", example: "MISSING_FIELDS" } },
      },
      AuthUser: {
        type: "object",
        properties: {
          id:       { type: "string", format: "uuid" },
          name:     { type: "string" },
          email:    { type: "string", format: "email" },
          role:     { type: "string", enum: ["admin", "member"] },
          initials: { type: "string" },
          color:    { type: "string" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user:  { $ref: "#/components/schemas/AuthUser" },
        },
      },
      User: {
        type: "object",
        properties: {
          id:       { type: "string", format: "uuid" },
          name:     { type: "string" },
          email:    { type: "string", format: "email" },
          role:     { type: "string", enum: ["admin", "member"] },
          initials: { type: "string" },
          color:    { type: "string" },
          bio:      { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Session: {
        type: "object",
        properties: {
          id:         { type: "string", format: "uuid" },
          userId:     { type: "string", format: "uuid" },
          ipAddress:  { type: "string", nullable: true },
          userAgent:  { type: "string", nullable: true },
          createdAt:  { type: "string", format: "date-time" },
          lastSeenAt: { type: "string", format: "date-time" },
          expiresAt:  { type: "string", format: "date-time" },
          revokedAt:  { type: "string", format: "date-time", nullable: true },
        },
      },
      Workspace: {
        type: "object",
        properties: {
          id:          { type: "string", format: "uuid" },
          name:        { type: "string" },
          timezone:    { type: "string" },
          language:    { type: "string" },
          inviteToken: { type: "string" },
          updatedAt:   { type: "string", format: "date-time" },
          createdAt:   { type: "string", format: "date-time" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          name:      { type: "string" },
          stack:     { type: "string" },
          status:    { type: "string", enum: ["active", "completed", "paused"] },
          progress:  { type: "integer", minimum: 0, maximum: 100 },
          updatedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Task: {
        type: "object",
        properties: {
          id:            { type: "string", format: "uuid" },
          projectId:     { type: "string", format: "uuid" },
          title:         { type: "string" },
          description:   { type: "string" },
          priority:      { type: "string", enum: ["low", "medium", "high", "critical"] },
          column:        { type: "string", enum: ["backlog", "progress", "review", "done"] },
          labels:        { type: "array", items: { type: "string" } },
          dueDate:       { type: "string", nullable: true },
          subtasksDone:  { type: "integer" },
          subtasksTotal: { type: "integer" },
          assigneeId:    { type: "string", format: "uuid", nullable: true },
          createdById:   { type: "string", format: "uuid", nullable: true },
          createdAt:     { type: "string", format: "date-time" },
          deletedAt:     { type: "string", format: "date-time", nullable: true },
        },
      },
      Client: {
        type: "object",
        properties: {
          id:            { type: "string", format: "uuid" },
          company:       { type: "string" },
          industry:      { type: "string" },
          contactName:   { type: "string" },
          contactEmail:  { type: "string", format: "email" },
          status:        { type: "string", enum: ["active", "prospect", "inactive"] },
          contractSince: { type: "string", nullable: true },
          lastActivity:  { type: "string", format: "date-time" },
          initials:      { type: "string" },
          color:         { type: "string" },
          createdAt:     { type: "string", format: "date-time" },
          deletedAt:     { type: "string", format: "date-time", nullable: true },
        },
      },
      AppError: {
        type: "object",
        properties: {
          id:            { type: "string", format: "uuid" },
          errorConfigId: { type: "string", format: "uuid", nullable: true },
          type:          { type: "string" },
          message:       { type: "string" },
          severity:      { type: "string", enum: ["critical", "error", "warning"] },
          status:        { type: "string", enum: ["unresolved", "resolved", "ignored"] },
          count:         { type: "integer" },
          usersAffected: { type: "integer" },
          stackTrace:    { type: "string" },
          firstSeen:     { type: "string", format: "date-time" },
          lastSeen:      { type: "string", format: "date-time" },
          metaUrl:       { type: "string" },
          metaBrowser:   { type: "string" },
          metaOs:        { type: "string" },
          metaUser:      { type: "string" },
          sparkline:     { type: "array", items: { type: "integer" } },
          createdAt:     { type: "string", format: "date-time" },
          deletedAt:     { type: "string", format: "date-time", nullable: true },
        },
      },
      ErrorConfig: {
        type: "object",
        properties: {
          id:           { type: "string", format: "uuid" },
          name:         { type: "string" },
          apiKeyId:     { type: "string", format: "uuid", nullable: true },
          createdAt:    { type: "string", format: "date-time" },
          apiKeyPrefix: { type: "string", nullable: true },
          errorCount:   { type: "integer" },
        },
      },
      ApiKey: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          name:      { type: "string" },
          prefix:    { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          revokedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ApiKeyCreated: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          name:      { type: "string" },
          prefix:    { type: "string" },
          key:       { type: "string", description: "Clave completa, visible solo en la creación." },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          userId:    { type: "string", format: "uuid" },
          type:      { type: "string" },
          title:     { type: "string" },
          body:      { type: "string" },
          entityId:  { type: "string", nullable: true },
          read:      { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Prospect: {
        type: "object",
        properties: {
          id:            { type: "string", format: "uuid" },
          name:          { type: "string" },
          industry:      { type: "string" },
          city:          { type: "string" },
          address:       { type: "string" },
          phone:         { type: "string" },
          website:       { type: "string" },
          hours:         { type: "string" },
          socialMedia:   { type: "string" },
          hasWebsite:    { type: "boolean" },
          hasSocialMedia:{ type: "boolean" },
          rating:        { type: "number" },
          reviewCount:   { type: "integer" },
          score:         { type: "integer" },
          scoreLabel:    { type: "string" },
          stage:         { type: "string", enum: ["new", "contacted", "interested", "discarded"] },
          notes:         { type: "string" },
          googleId:      { type: "string", nullable: true },
          createdAt:     { type: "string", format: "date-time" },
        },
      },
      MailConfig: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          name:      { type: "string" },
          host:      { type: "string" },
          port:      { type: "integer" },
          user:      { type: "string" },
          from:      { type: "string" },
          apiKeyId:  { type: "string", format: "uuid", nullable: true },
          updatedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MailTemplate: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          configId:  { type: "string", format: "uuid" },
          name:      { type: "string" },
          subject:   { type: "string" },
          html:      { type: "string" },
          params:    { type: "array", items: { type: "string" } },
          updatedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MailLog: {
        type: "object",
        properties: {
          id:           { type: "string", format: "uuid" },
          configId:     { type: "string", format: "uuid" },
          to:           { type: "string", format: "email" },
          subject:      { type: "string" },
          templateName: { type: "string" },
          status:       { type: "string", enum: ["sent", "failed"] },
          error:        { type: "string" },
          messageId:    { type: "string" },
          createdAt:    { type: "string", format: "date-time" },
        },
      },
      MercadoPagoConfig: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          name:      { type: "string" },
          publicKey: { type: "string" },
          apiKeyId:  { type: "string", format: "uuid", nullable: true },
          updatedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MercadoPagoLog: {
        type: "object",
        properties: {
          id:                { type: "string", format: "uuid" },
          configId:          { type: "string", format: "uuid" },
          externalReference: { type: "string" },
          preferenceId:      { type: "string" },
          paymentId:         { type: "string" },
          webhookUrl:        { type: "string" },
          checkoutUrl:       { type: "string" },
          status:            { type: "string" },
          amount:            { type: "number" },
          currency:          { type: "string" },
          error:             { type: "string" },
          updatedAt:         { type: "string", format: "date-time" },
          createdAt:         { type: "string", format: "date-time" },
        },
      },
      ArcaConfig: {
        type: "object",
        properties: {
          id:         { type: "string", format: "uuid" },
          name:       { type: "string" },
          cuit:       { type: "string" },
          production: { type: "boolean" },
          apiKeyId:   { type: "string", format: "uuid", nullable: true },
          updatedAt:  { type: "string", format: "date-time" },
          createdAt:  { type: "string", format: "date-time" },
        },
      },
      ArcaLog: {
        type: "object",
        properties: {
          id:         { type: "string", format: "uuid" },
          configId:   { type: "string", format: "uuid" },
          service:    { type: "string" },
          method:     { type: "string" },
          request:    { type: "string" },
          response:   { type: "string" },
          status:     { type: "string", enum: ["ok", "error"] },
          error:      { type: "string" },
          durationMs: { type: "integer" },
          updatedAt:  { type: "string", format: "date-time" },
          createdAt:  { type: "string", format: "date-time" },
        },
      },
      NotifSettings: {
        type: "object",
        properties: {
          newProject:   { type: "boolean" },
          taskAssigned: { type: "boolean" },
          taskComment:  { type: "boolean" },
          deployDone:   { type: "boolean" },
          weeklyDigest: { type: "boolean" },
          clientUpdate: { type: "boolean" },
        },
      },
      WhatsAppConfigPublic: {
        type: "object",
        properties: {
          id:               { type: "string", format: "uuid" },
          name:             { type: "string" },
          phoneNumberId:    { type: "string" },
          businessAccountId: { type: "string", nullable: true },
          apiKeyId:         { type: "string", format: "uuid", nullable: true },
          updatedAt:        { type: "string", format: "date-time" },
          createdAt:        { type: "string", format: "date-time" },
        },
      },
      WhatsAppMessage: {
        type: "object",
        properties: {
          id:        { type: "string", format: "uuid" },
          configId:  { type: "string", format: "uuid" },
          direction: { type: "string", enum: ["sent", "received"] },
          from:      { type: "string", example: "5491112345678" },
          to:        { type: "string", example: "5491187654321" },
          body:      { type: "string" },
          type:      { type: "string", example: "text" },
          wamid:     { type: "string", description: "ID de mensaje en Meta" },
          status:    { type: "string", example: "sent" },
          error:     { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      WhatsAppLog: {
        type: "object",
        properties: {
          id:         { type: "string", format: "uuid" },
          configId:   { type: "string", format: "uuid" },
          method:     { type: "string" },
          request:    { type: "string" },
          response:   { type: "string" },
          status:     { type: "string", enum: ["ok", "error"] },
          error:      { type: "string" },
          durationMs: { type: "integer" },
          createdAt:  { type: "string", format: "date-time" },
        },
      },
    },
  },

  tags: [
    { name: "auth",          description: "Autenticación y recuperación de contraseña" },
    { name: "users",         description: "Perfil, sesiones y configuración del usuario autenticado" },
    { name: "workspace",     description: "Configuración global del workspace" },
    { name: "stats",         description: "Estadísticas generales y reportes" },
    { name: "projects",      description: "Proyectos y sus tareas" },
    { name: "tasks",         description: "Operaciones sobre tareas individuales" },
    { name: "clients",       description: "Clientes" },
    { name: "errors",        description: "Error tracking (ingest y gestión)" },
    { name: "errorConfigs",  description: "Configuraciones de error tracking" },
    { name: "apiKeys",       description: "API keys para servicios externos" },
    { name: "notifications", description: "Notificaciones in-app" },
    { name: "prospects",     description: "Prospección de clientes" },
    { name: "mail",          description: "Envío de mails y configuración SMTP" },
    { name: "mercadopago",   description: "Pagos y webhooks de MercadoPago" },
    { name: "arca",          description: "Facturación electrónica ARCA (AFIP)" },
    { name: "whatsapp",      description: "Mensajería WhatsApp Business (Meta Cloud API)" },
  ],

  paths: {
    // ── AUTH ──────────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Registrar usuario",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "initials", "color"],
                properties: {
                  name:     { type: "string" },
                  email:    { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  initials: { type: "string" },
                  color:    { type: "string" },
                  role:     { type: "string", enum: ["admin", "member"] },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          "400": { description: "Campos faltantes", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Email en uso", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Iniciar sesión",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email:    { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          "401": { description: "Credenciales inválidas", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["auth"],
        summary: "Solicitar reset de contraseña",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } },
            },
          },
        },
        responses: {
          "200": {
            description: "Email enviado (siempre 200 para no revelar si el email existe)",
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, resetLink: { type: "string" } } } } },
          },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["auth"],
        summary: "Restablecer contraseña",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "newPassword"],
                properties: {
                  token:       { type: "string" },
                  newPassword: { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "204": { description: "Contraseña actualizada" },
          "400": { description: "Token inválido o campos faltantes", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── USERS ─────────────────────────────────────────────────────────────
    "/users/me": {
      get: {
        tags: ["users"],
        summary: "Obtener perfil propio",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "No autenticado" },
        },
      },
      patch: {
        tags: ["users"],
        summary: "Actualizar perfil propio",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:     { type: "string" },
                  initials: { type: "string" },
                  color:    { type: "string" },
                  bio:      { type: "string" },
                  role:     { type: "string", enum: ["admin", "member"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/users/me/password": {
      patch: {
        tags: ["users"],
        summary: "Cambiar contraseña propia",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword:     { type: "string", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "204": { description: "Contraseña actualizada" },
          "400": { description: "Contraseña actual incorrecta o campos faltantes", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/users/me/notifications": {
      get: {
        tags: ["users"],
        summary: "Obtener configuración de notificaciones",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/NotifSettings" } } } },
          "401": { description: "No autenticado" },
        },
      },
      patch: {
        tags: ["users"],
        summary: "Actualizar configuración de notificaciones",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/NotifSettings" } } },
        },
        responses: {
          "204": { description: "Actualizado" },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/users/me/sessions": {
      get: {
        tags: ["users"],
        summary: "Listar sesiones activas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Session" } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/users/me/sessions/{id}": {
      delete: {
        tags: ["users"],
        summary: "Revocar sesión",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Sesión revocada" },
          "401": { description: "No autenticado" },
          "404": { description: "Sesión no encontrada" },
        },
      },
    },
    "/users": {
      get: {
        tags: ["users"],
        summary: "Listar usuarios",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/User" } } } } },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["users"],
        summary: "Crear usuario (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "initials", "color"],
                properties: {
                  name:     { type: "string" },
                  email:    { type: "string", format: "email" },
                  password: { type: "string" },
                  initials: { type: "string" },
                  color:    { type: "string" },
                  role:     { type: "string", enum: ["admin", "member"] },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creado", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "409": { description: "Email en uso" },
        },
      },
    },
    "/users/{id}": {
      delete: {
        tags: ["users"],
        summary: "Eliminar usuario (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminado" },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "Usuario no encontrado" },
        },
      },
    },

    // ── WORKSPACE ─────────────────────────────────────────────────────────
    "/workspace": {
      get: {
        tags: ["workspace"],
        summary: "Obtener configuración del workspace",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Workspace" } } } },
          "401": { description: "No autenticado" },
        },
      },
      patch: {
        tags: ["workspace"],
        summary: "Actualizar configuración del workspace",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:     { type: "string" },
                  timezone: { type: "string" },
                  language: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Workspace" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },

    // ── STATS ─────────────────────────────────────────────────────────────
    "/stats/overview": {
      get: {
        tags: ["stats"],
        summary: "Estadísticas generales del dashboard",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/stats/reports": {
      get: {
        tags: ["stats"],
        summary: "Reporte de actividad por período",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "period", in: "query", required: false,
            schema: { type: "string", enum: ["week", "month", "quarter"], default: "week" },
          },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
          "400": { description: "Período inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },

    // ── PROJECTS ──────────────────────────────────────────────────────────
    "/projects": {
      get: {
        tags: ["projects"],
        summary: "Listar proyectos",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "completed", "paused"] } },
          { name: "q",      in: "query", schema: { type: "string" }, description: "Búsqueda por nombre" },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Project" } } } } },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["projects"],
        summary: "Crear proyecto",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "stack"],
                properties: {
                  name:      { type: "string" },
                  stack:     { type: "string" },
                  status:    { type: "string", enum: ["active", "completed", "paused"] },
                  memberIds: { type: "array", items: { type: "string", format: "uuid" } },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/projects/{id}": {
      get: {
        tags: ["projects"],
        summary: "Obtener proyecto",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
      put: {
        tags: ["projects"],
        summary: "Actualizar proyecto",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:      { type: "string" },
                  stack:     { type: "string" },
                  status:    { type: "string", enum: ["active", "completed", "paused"] },
                  progress:  { type: "integer" },
                  memberIds: { type: "array", items: { type: "string", format: "uuid" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
      delete: {
        tags: ["projects"],
        summary: "Eliminar proyecto",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminado" },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
    },
    "/projects/{id}/tasks": {
      get: {
        tags: ["projects"],
        summary: "Listar tareas de un proyecto",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Task" } } } } },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["projects"],
        summary: "Crear tarea en un proyecto",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title:         { type: "string" },
                  description:   { type: "string" },
                  priority:      { type: "string", enum: ["low", "medium", "high", "critical"] },
                  column:        { type: "string", enum: ["backlog", "progress", "review", "done"] },
                  labels:        { type: "array", items: { type: "string" } },
                  dueDate:       { type: "string" },
                  subtasksTotal: { type: "integer" },
                  assigneeId:    { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creada", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },

    // ── TASKS ─────────────────────────────────────────────────────────────
    "/tasks/{id}": {
      put: {
        tags: ["tasks"],
        summary: "Actualizar tarea",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title:         { type: "string" },
                  description:   { type: "string" },
                  priority:      { type: "string", enum: ["low", "medium", "high", "critical"] },
                  column:        { type: "string", enum: ["backlog", "progress", "review", "done"] },
                  labels:        { type: "array", items: { type: "string" } },
                  dueDate:       { type: "string" },
                  subtasksDone:  { type: "integer" },
                  subtasksTotal: { type: "integer" },
                  assigneeId:    { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrada" },
        },
      },
      delete: {
        tags: ["tasks"],
        summary: "Eliminar tarea",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminada" },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrada" },
        },
      },
    },

    // ── CLIENTS ───────────────────────────────────────────────────────────
    "/clients": {
      get: {
        tags: ["clients"],
        summary: "Listar clientes",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "prospect", "inactive"] } },
          { name: "q",      in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Client" } } } } },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["clients"],
        summary: "Crear cliente",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["company", "contactName", "contactEmail", "industry", "initials", "color"],
                properties: {
                  company:       { type: "string" },
                  industry:      { type: "string" },
                  contactName:   { type: "string" },
                  contactEmail:  { type: "string", format: "email" },
                  status:        { type: "string", enum: ["active", "prospect", "inactive"] },
                  contractSince: { type: "string" },
                  initials:      { type: "string" },
                  color:         { type: "string" },
                  projectIds:    { type: "array", items: { type: "string", format: "uuid" } },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Client" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/clients/{id}": {
      get: {
        tags: ["clients"],
        summary: "Obtener cliente",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Client" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
      put: {
        tags: ["clients"],
        summary: "Actualizar cliente",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  company:       { type: "string" },
                  industry:      { type: "string" },
                  contactName:   { type: "string" },
                  contactEmail:  { type: "string", format: "email" },
                  status:        { type: "string", enum: ["active", "prospect", "inactive"] },
                  contractSince: { type: "string" },
                  initials:      { type: "string" },
                  color:         { type: "string" },
                  projectIds:    { type: "array", items: { type: "string", format: "uuid" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Client" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
      delete: {
        tags: ["clients"],
        summary: "Eliminar cliente",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminado" },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
    },

    // ── ERRORS ────────────────────────────────────────────────────────────
    "/errors/ingest": {
      post: {
        tags: ["errors"],
        summary: "Ingestar error (API key)",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["type", "message"],
                properties: {
                  type:          { type: "string" },
                  message:       { type: "string" },
                  severity:      { type: "string", enum: ["critical", "error", "warning"] },
                  stackTrace:    { type: "string" },
                  errorConfigId: { type: "string", format: "uuid" },
                  meta: {
                    type: "object",
                    properties: {
                      url:     { type: "string" },
                      browser: { type: "string" },
                      os:      { type: "string" },
                      user:    { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Error registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/AppError" } } } },
          "400": { description: "Campos faltantes" },
          "401": { description: "API key inválida" },
        },
      },
    },
    "/errors": {
      get: {
        tags: ["errors"],
        summary: "Listar errores",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "severity",      in: "query", schema: { type: "string", enum: ["critical", "error", "warning"] } },
          { name: "status",        in: "query", schema: { type: "string", enum: ["unresolved", "resolved", "ignored"] } },
          { name: "errorConfigId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "q",             in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/AppError" } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/errors/{id}": {
      get: {
        tags: ["errors"],
        summary: "Obtener error",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AppError" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
      delete: {
        tags: ["errors"],
        summary: "Eliminar error",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminado" },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
    },
    "/errors/{id}/status": {
      put: {
        tags: ["errors"],
        summary: "Actualizar estado de un error",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["unresolved", "resolved", "ignored"] } },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AppError" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
    },

    // ── ERROR CONFIGS ─────────────────────────────────────────────────────
    "/error-configs": {
      get: {
        tags: ["errorConfigs"],
        summary: "Listar configuraciones de error tracking",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ErrorConfig" } } } } },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["errorConfigs"],
        summary: "Crear configuración de error tracking",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name:     { type: "string" },
                  apiKeyId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorConfig" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/error-configs/{id}": {
      get: {
        tags: ["errorConfigs"],
        summary: "Obtener configuración de error tracking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorConfig" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrada" },
        },
      },
      delete: {
        tags: ["errorConfigs"],
        summary: "Eliminar configuración de error tracking",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminada" },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrada" },
        },
      },
    },

    // ── API KEYS ──────────────────────────────────────────────────────────
    "/api-keys": {
      get: {
        tags: ["apiKeys"],
        summary: "Listar API keys",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ApiKey" } } } } },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["apiKeys"],
        summary: "Crear API key (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Creada. La clave completa solo se retorna aquí.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiKeyCreated" } } },
          },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
    },
    "/api-keys/{id}": {
      delete: {
        tags: ["apiKeys"],
        summary: "Revocar API key (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Revocada" },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrada" },
        },
      },
    },

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────
    "/notifications": {
      get: {
        tags: ["notifications"],
        summary: "Listar notificaciones del usuario",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Notification" } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/notifications/unread-count": {
      get: {
        tags: ["notifications"],
        summary: "Cantidad de notificaciones no leídas",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { type: "object", properties: { count: { type: "integer" } } } } },
          },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/notifications/read-all": {
      patch: {
        tags: ["notifications"],
        summary: "Marcar todas como leídas",
        security: [{ bearerAuth: [] }],
        responses: {
          "204": { description: "OK" },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        tags: ["notifications"],
        summary: "Marcar notificación como leída",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Notification" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrada" },
        },
      },
    },

    // ── PROSPECTS ─────────────────────────────────────────────────────────
    "/prospects": {
      get: {
        tags: ["prospects"],
        summary: "Listar prospectos",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "stage", in: "query", schema: { type: "string", enum: ["new", "contacted", "interested", "discarded"] } },
          { name: "q",     in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Prospect" } } } } },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["prospects"],
        summary: "Crear prospecto",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "city"],
                properties: {
                  name:     { type: "string" },
                  city:     { type: "string" },
                  industry: { type: "string" },
                  phone:    { type: "string" },
                  website:  { type: "string" },
                  notes:    { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Prospect" } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/prospects/bulk": {
      post: {
        tags: ["prospects"],
        summary: "Crear prospectos en masa",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prospects"],
                properties: {
                  prospects: { type: "array", items: { $ref: "#/components/schemas/Prospect" } },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creados", content: { "application/json": { schema: { type: "object", properties: { created: { type: "integer" } } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/prospects/{id}": {
      patch: {
        tags: ["prospects"],
        summary: "Actualizar prospecto",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  stage: { type: "string", enum: ["new", "contacted", "interested", "discarded"] },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Prospect" } } } },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
      delete: {
        tags: ["prospects"],
        summary: "Eliminar prospecto",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminado" },
          "401": { description: "No autenticado" },
          "404": { description: "No encontrado" },
        },
      },
    },

    // ── MAIL ──────────────────────────────────────────────────────────────
    "/mail/send": {
      post: {
        tags: ["mail"],
        summary: "Enviar email (API key)",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["config", "to"],
                properties: {
                  config:   { type: "string", description: "Nombre de la MailConfig a usar" },
                  to:       { type: "string", format: "email" },
                  template: { type: "string", description: "Nombre del template (excluyente con subject+html)" },
                  vars:     { type: "object", additionalProperties: { type: "string" } },
                  subject:  { type: "string" },
                  html:     { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Email enviado",
            content: { "application/json": { schema: { type: "object", properties: { messageId: { type: "string" } } } } },
          },
          "400": { description: "Campos faltantes o template vars incorrectas", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "API key inválida" },
          "404": { description: "Config o template no encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "502": { description: "Fallo al enviar", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/mail/configs": {
      get: {
        tags: ["mail"],
        summary: "Listar configuraciones SMTP (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MailConfig" } } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
      post: {
        tags: ["mail"],
        summary: "Crear configuración SMTP (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "host", "port", "user", "pass", "from"],
                properties: {
                  name: { type: "string" },
                  host: { type: "string" },
                  port: { type: "integer" },
                  user: { type: "string" },
                  pass: { type: "string" },
                  from: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creada", content: { "application/json": { schema: { $ref: "#/components/schemas/MailConfig" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
    },
    "/mail/configs/{id}": {
      put: {
        tags: ["mail"],
        summary: "Actualizar configuración SMTP (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  host: { type: "string" },
                  port: { type: "integer" },
                  user: { type: "string" },
                  pass: { type: "string" },
                  from: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/MailConfig" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrada" },
        },
      },
      delete: {
        tags: ["mail"],
        summary: "Eliminar configuración SMTP (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminada" },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrada" },
        },
      },
    },
    "/mail/configs/{configId}/logs": {
      get: {
        tags: ["mail"],
        summary: "Listar logs de emails de una config",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "configId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "limit",    in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MailLog" } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/mail/configs/{configId}/templates": {
      get: {
        tags: ["mail"],
        summary: "Listar templates de una config",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "configId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MailTemplate" } } } } },
          "401": { description: "No autenticado" },
        },
      },
      post: {
        tags: ["mail"],
        summary: "Crear template (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "configId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "subject", "html"],
                properties: {
                  name:    { type: "string" },
                  subject: { type: "string" },
                  html:    { type: "string" },
                  params:  { type: "array", items: { type: "string" }, description: "Variables del template, ej: ['nombre', 'link']" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creado", content: { "application/json": { schema: { $ref: "#/components/schemas/MailTemplate" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
    },
    "/mail/configs/{configId}/templates/{id}": {
      put: {
        tags: ["mail"],
        summary: "Actualizar template (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "configId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "id",       in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:    { type: "string" },
                  subject: { type: "string" },
                  html:    { type: "string" },
                  params:  { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/MailTemplate" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrado" },
        },
      },
      delete: {
        tags: ["mail"],
        summary: "Eliminar template (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "configId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "id",       in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "204": { description: "Eliminado" },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrado" },
        },
      },
    },

    // ── MERCADOPAGO ───────────────────────────────────────────────────────
    "/mp/pay": {
      post: {
        tags: ["mercadopago"],
        summary: "Crear preferencia de pago (API key)",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["config", "items"],
                properties: {
                  config:             { type: "string", description: "Nombre de la MercadoPagoConfig" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["title", "quantity", "unit_price"],
                      properties: {
                        id:          { type: "string" },
                        title:       { type: "string" },
                        quantity:    { type: "integer" },
                        unit_price:  { type: "number" },
                        currency_id: { type: "string", default: "ARS" },
                      },
                    },
                  },
                  external_reference: { type: "string" },
                  webhook_url:        { type: "string" },
                  back_url:           { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Preferencia creada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    preference_id:        { type: "string" },
                    checkout_url:         { type: "string" },
                    sandbox_checkout_url: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Campos faltantes", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "API key inválida" },
          "404": { description: "Config no encontrada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "502": { description: "Error en MercadoPago", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/mp/payment/{paymentId}": {
      get: {
        tags: ["mercadopago"],
        summary: "Obtener estado de pago (API key)",
        security: [{ apiKey: [] }],
        parameters: [
          { name: "paymentId", in: "path", required: true, schema: { type: "string" } },
          { name: "config",    in: "query", required: true, schema: { type: "string" }, description: "Nombre de la MercadoPagoConfig" },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
          "401": { description: "API key inválida" },
          "404": { description: "Pago no encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/mp/webhook/{configName}": {
      post: {
        tags: ["mercadopago"],
        summary: "Webhook de MercadoPago (sin auth)",
        parameters: [{ name: "configName", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "Notificación IPN o webhook de MercadoPago",
                properties: {
                  topic:  { type: "string" },
                  id:     { type: "string" },
                  type:   { type: "string" },
                  action: { type: "string" },
                  data:   { type: "object", properties: { id: { type: "string" } } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Recibido (siempre 200 para evitar reintentos de MP)" },
        },
      },
    },
    "/mp/configs": {
      get: {
        tags: ["mercadopago"],
        summary: "Listar configuraciones de MercadoPago (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MercadoPagoConfig" } } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
      post: {
        tags: ["mercadopago"],
        summary: "Crear configuración de MercadoPago (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "accessToken", "publicKey"],
                properties: {
                  name:        { type: "string" },
                  accessToken: { type: "string" },
                  publicKey:   { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creada", content: { "application/json": { schema: { $ref: "#/components/schemas/MercadoPagoConfig" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
    },
    "/mp/configs/{id}": {
      put: {
        tags: ["mercadopago"],
        summary: "Actualizar configuración de MercadoPago (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:        { type: "string" },
                  accessToken: { type: "string" },
                  publicKey:   { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/MercadoPagoConfig" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrada" },
        },
      },
      delete: {
        tags: ["mercadopago"],
        summary: "Eliminar configuración de MercadoPago (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminada" },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrada" },
        },
      },
    },
    "/mp/configs/{configId}/logs": {
      get: {
        tags: ["mercadopago"],
        summary: "Listar logs de pagos de una config",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "configId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "limit",    in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/MercadoPagoLog" } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },

    // ── ARCA ──────────────────────────────────────────────────────────────
    "/arca/configs": {
      get: {
        tags: ["arca"],
        summary: "Listar configuraciones ARCA (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ArcaConfig" } } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
      post: {
        tags: ["arca"],
        summary: "Crear configuración ARCA (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "cuit", "cert", "privateKey"],
                properties: {
                  name:       { type: "string" },
                  cuit:       { type: "string", description: "CUIT del contribuyente, ej: 20-12345678-9" },
                  cert:       { type: "string", description: "Certificado digital en formato PEM" },
                  privateKey: { type: "string", description: "Clave privada en formato PEM" },
                  production: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creada", content: { "application/json": { schema: { $ref: "#/components/schemas/ArcaConfig" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
    },
    "/arca/configs/{id}": {
      put: {
        tags: ["arca"],
        summary: "Actualizar configuración ARCA (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:       { type: "string" },
                  cuit:       { type: "string" },
                  cert:       { type: "string" },
                  privateKey: { type: "string" },
                  production: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ArcaConfig" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrada" },
        },
      },
      delete: {
        tags: ["arca"],
        summary: "Eliminar configuración ARCA (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminada" },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "No encontrada" },
        },
      },
    },
    "/arca/configs/{id}/assign-key": {
      post: {
        tags: ["arca"],
        summary: "Asociar API key a config ARCA (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["apiKeyId"],
                properties: { apiKeyId: { type: "string", format: "uuid" } },
              },
            },
          },
        },
        responses: {
          "204": { description: "Asociada" },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
          "404": { description: "Config no encontrada" },
        },
      },
    },
    "/arca/configs/{id}/assign-key/{apiKeyId}": {
      delete: {
        tags: ["arca"],
        summary: "Desasociar API key de config ARCA (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id",       in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "apiKeyId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "204": { description: "Desasociada" },
          "401": { description: "No autenticado" },
          "403": { description: "Sin permisos de admin" },
        },
      },
    },
    "/arca/configs/{configId}/logs": {
      get: {
        tags: ["arca"],
        summary: "Listar logs de operaciones ARCA",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "configId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "limit",    in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ArcaLog" } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/arca/wsfe/voucher": {
      post: {
        tags: ["arca"],
        summary: "Emitir comprobante electrónico (API key)",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["voucher"],
                properties: {
                  voucher: { type: "object", description: "Estructura del comprobante según el SDK de ARCA" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Comprobante emitido", content: { "application/json": { schema: { type: "object" } } } },
          "401": { description: "API key inválida" },
          "403": { description: "API key sin configuración ARCA asociada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "502": { description: "Error en ARCA/AFIP", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/arca/wsfe/sales-points": {
      get: {
        tags: ["arca"],
        summary: "Obtener puntos de venta habilitados (API key)",
        security: [{ apiKey: [] }],
        parameters: [
          { name: "cuit", in: "query", required: true, schema: { type: "string" }, description: "CUIT del contribuyente a consultar (11 dígitos, sin guiones)" },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
          "400": { description: "CUIT no proporcionado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "API key inválida" },
          "403": { description: "API key sin configuración ARCA asociada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "502": { description: "Error en ARCA/AFIP", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/arca/padron/{identifier}": {
      get: {
        tags: ["arca"],
        summary: "Consultar datos de contribuyente en padrón AFIP (API key)",
        security: [{ apiKey: [] }],
        parameters: [
          { name: "identifier", in: "path", required: true, schema: { type: "integer" }, description: "CUIT/CUIL del contribuyente (sin guiones)" },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
          "401": { description: "API key inválida" },
          "403": { description: "API key sin configuración ARCA asociada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "502": { description: "Error en ARCA/AFIP", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },

    // ── WhatsApp ───────────────────────────────────────────────────────────────

    "/whatsapp/send": {
      post: {
        tags: ["whatsapp"],
        summary: "Enviar mensaje de texto (API key)",
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["to", "body"],
                properties: {
                  to:   { type: "string", example: "5491123456789", description: "Número destino en formato internacional (sin +)" },
                  body: { type: "string", example: "Hola! Su turno es mañana a las 10hs." },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Mensaje enviado", content: { "application/json": { schema: { $ref: "#/components/schemas/WhatsAppMessage" } } } },
          "401": { description: "API key inválida" },
          "403": { description: "API key sin configuración WhatsApp asociada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "502": { description: "Error al enviar a Meta", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/whatsapp/webhook/{configName}": {
      get: {
        tags: ["whatsapp"],
        summary: "Verificar webhook de Meta (challenge)",
        parameters: [
          { name: "configName",       in: "path",  required: true, schema: { type: "string" } },
          { name: "hub.mode",         in: "query", required: true, schema: { type: "string", enum: ["subscribe"] } },
          { name: "hub.verify_token", in: "query", required: true, schema: { type: "string" } },
          { name: "hub.challenge",    in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Challenge devuelto — Meta verificó el webhook" },
          "403": { description: "Token de verificación incorrecto" },
          "404": { description: "Config no encontrada" },
        },
      },
      post: {
        tags: ["whatsapp"],
        summary: "Recibir eventos de Meta (mensajes entrantes)",
        parameters: [
          { name: "configName", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", description: "Payload estándar de Meta Webhooks" } } },
        },
        responses: {
          "200": { description: "Aceptado — procesado de forma asíncrona" },
        },
      },
    },
    "/whatsapp/configs": {
      get: {
        tags: ["whatsapp"],
        summary: "Listar configuraciones WhatsApp (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/WhatsAppConfigPublic" } } } } },
          "401": { description: "No autenticado" },
          "403": { description: "No es admin" },
        },
      },
      post: {
        tags: ["whatsapp"],
        summary: "Crear configuración WhatsApp (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "phoneNumberId", "accessToken", "webhookVerifyToken"],
                properties: {
                  name:               { type: "string", example: "mi-negocio" },
                  phoneNumberId:      { type: "string", example: "123456789012345", description: "phone_number_id de Meta" },
                  accessToken:        { type: "string", description: "Bearer token de Meta Graph API" },
                  webhookVerifyToken: { type: "string", description: "Token secreto para verificar webhooks de Meta" },
                  businessAccountId:  { type: "string", nullable: true, description: "WABA ID (opcional)" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Creado", content: { "application/json": { schema: { $ref: "#/components/schemas/WhatsAppConfigPublic" } } } },
          "400": { description: "Faltan campos requeridos", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "No autenticado" },
          "403": { description: "No es admin" },
        },
      },
    },
    "/whatsapp/configs/{id}": {
      put: {
        tags: ["whatsapp"],
        summary: "Actualizar configuración WhatsApp (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name:               { type: "string" },
                  phoneNumberId:      { type: "string" },
                  accessToken:        { type: "string" },
                  webhookVerifyToken: { type: "string" },
                  businessAccountId:  { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/WhatsAppConfigPublic" } } } },
          "404": { description: "Config no encontrada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      delete: {
        tags: ["whatsapp"],
        summary: "Eliminar configuración WhatsApp (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "204": { description: "Eliminado" },
          "404": { description: "Config no encontrada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/whatsapp/configs/{id}/assign-key": {
      post: {
        tags: ["whatsapp"],
        summary: "Asignar API key a configuración WhatsApp (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["apiKeyId"],
                properties: { apiKeyId: { type: "string", format: "uuid" } },
              },
            },
          },
        },
        responses: {
          "204": { description: "Asignada" },
          "404": { description: "Config no encontrada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/whatsapp/configs/{id}/assign-key/{apiKeyId}": {
      delete: {
        tags: ["whatsapp"],
        summary: "Desasignar API key de configuración WhatsApp (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id",       in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "apiKeyId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "204": { description: "Desasignada" },
          "404": { description: "Config no encontrada", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/whatsapp/configs/{configId}/messages": {
      get: {
        tags: ["whatsapp"],
        summary: "Listar mensajes de una configuración",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "configId",  in: "path",  required: true,  schema: { type: "string", format: "uuid" } },
          { name: "direction", in: "query", required: false, schema: { type: "string", enum: ["sent", "received"] }, description: "Filtrar por dirección" },
          { name: "limit",     in: "query", required: false, schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/WhatsAppMessage" } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
    "/whatsapp/configs/{configId}/logs": {
      get: {
        tags: ["whatsapp"],
        summary: "Listar logs técnicos de una configuración",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "configId", in: "path",  required: true,  schema: { type: "string", format: "uuid" } },
          { name: "limit",    in: "query", required: false, schema: { type: "integer", default: 50 } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/WhatsAppLog" } } } } },
          "401": { description: "No autenticado" },
        },
      },
    },
  },
} as const;

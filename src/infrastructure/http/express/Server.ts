import express, { type Express } from "express";
import cors from "cors";
import { env } from "../../../config/env";
import { PrismaUserRepository } from "../../repositories/PrismaUserRepository";
import { PrismaSessionRepository } from "../../repositories/PrismaSessionRepository";
import { PrismaProjectRepository } from "../../repositories/PrismaProjectRepository";
import { PrismaTaskRepository } from "../../repositories/PrismaTaskRepository";
import { PrismaClientRepository } from "../../repositories/PrismaClientRepository";
import { PrismaAppErrorRepository } from "../../repositories/PrismaAppErrorRepository";
import { PrismaApiKeyRepository } from "../../repositories/PrismaApiKeyRepository";
import { PrismaWorkspaceRepository } from "../../repositories/PrismaWorkspaceRepository";
import { PrismaStatsRepository } from "../../repositories/PrismaStatsRepository";
import { BcryptPasswordHasher } from "../../services/BcryptPasswordHasher";
import { JwtTokenService } from "../../services/JwtTokenService";
import { RegisterUser } from "../../../application/use-cases/RegisterUser";
import { LoginUser } from "../../../application/use-cases/LoginUser";
import { CreateProject } from "../../../application/use-cases/CreateProject";
import { ListProjects } from "../../../application/use-cases/ListProjects";
import { GetProject } from "../../../application/use-cases/GetProject";
import { UpdateProject } from "../../../application/use-cases/UpdateProject";
import { DeleteProject } from "../../../application/use-cases/DeleteProject";
import { CreateTask } from "../../../application/use-cases/CreateTask";
import { ListTasksByProject } from "../../../application/use-cases/ListTasksByProject";
import { UpdateTask } from "../../../application/use-cases/UpdateTask";
import { DeleteTask } from "../../../application/use-cases/DeleteTask";
import { IngestError } from "../../../application/use-cases/IngestError";
import { ListErrors } from "../../../application/use-cases/ListErrors";
import { GetError } from "../../../application/use-cases/GetError";
import { UpdateErrorStatus } from "../../../application/use-cases/UpdateErrorStatus";
import { DeleteError } from "../../../application/use-cases/DeleteError";
import { CreateClient } from "../../../application/use-cases/CreateClient";
import { ListClients } from "../../../application/use-cases/ListClients";
import { GetClient } from "../../../application/use-cases/GetClient";
import { UpdateClient } from "../../../application/use-cases/UpdateClient";
import { DeleteClient } from "../../../application/use-cases/DeleteClient";
import { ListUsers } from "../../../application/use-cases/ListUsers";
import { UpdateUser } from "../../../application/use-cases/UpdateUser";
import { ChangePassword } from "../../../application/use-cases/ChangePassword";
import { ForgotPassword } from "../../../application/use-cases/ForgotPassword";
import { ResetPassword } from "../../../application/use-cases/ResetPassword";
import { GetWorkspace } from "../../../application/use-cases/GetWorkspace";
import { UpdateWorkspace } from "../../../application/use-cases/UpdateWorkspace";
import { GetOverviewStats } from "../../../application/use-cases/GetOverviewStats";
import { GetReportStats } from "../../../application/use-cases/GetReportStats";
import { CreateApiKey } from "../../../application/use-cases/CreateApiKey";
import { ListApiKeys } from "../../../application/use-cases/ListApiKeys";
import { RevokeApiKey } from "../../../application/use-cases/RevokeApiKey";
import { GetActiveSessions } from "../../../application/use-cases/GetActiveSessions";
import { RevokeSession } from "../../../application/use-cases/RevokeSession";
import { CreateProspect } from "../../../application/use-cases/CreateProspect";
import { BulkCreateProspects } from "../../../application/use-cases/BulkCreateProspects";
import { ListProspects } from "../../../application/use-cases/ListProspects";
import { UpdateProspect } from "../../../application/use-cases/UpdateProspect";
import { DeleteProspect } from "../../../application/use-cases/DeleteProspect";
import { CreateErrorConfig } from "../../../application/use-cases/CreateErrorConfig";
import { ListErrorConfigs } from "../../../application/use-cases/ListErrorConfigs";
import { GetErrorConfig } from "../../../application/use-cases/GetErrorConfig";
import { DeleteErrorConfig } from "../../../application/use-cases/DeleteErrorConfig";
import { SendMail } from "../../../application/use-cases/SendMail";
import { ListMailConfigs } from "../../../application/use-cases/ListMailConfigs";
import { CreateMailConfig } from "../../../application/use-cases/CreateMailConfig";
import { UpdateMailConfig } from "../../../application/use-cases/UpdateMailConfig";
import { DeleteMailConfig } from "../../../application/use-cases/DeleteMailConfig";
import { ListMailLogs } from "../../../application/use-cases/ListMailLogs";
import { ListMailTemplates } from "../../../application/use-cases/ListMailTemplates";
import { CreateMailTemplate } from "../../../application/use-cases/CreateMailTemplate";
import { UpdateMailTemplate } from "../../../application/use-cases/UpdateMailTemplate";
import { DeleteMailTemplate } from "../../../application/use-cases/DeleteMailTemplate";
import { PrismaMailConfigRepository } from "../../repositories/PrismaMailConfigRepository";
import { PrismaMailTemplateRepository } from "../../repositories/PrismaMailTemplateRepository";
import { PrismaMailLogRepository } from "../../repositories/PrismaMailLogRepository";
import { MailController } from "../../../interfaces/http/controllers/MailController";
import { buildMailRoutes } from "./routes/mailRoutes";
import { buildIngestKeyMiddleware } from "./middleware/ingestKeyMiddleware";
import { CreateNotification } from "../../../application/use-cases/CreateNotification";
import { GetNotifications } from "../../../application/use-cases/GetNotifications";
import { GetUnreadCount } from "../../../application/use-cases/GetUnreadCount";
import { MarkNotificationRead } from "../../../application/use-cases/MarkNotificationRead";
import { MarkAllNotificationsRead } from "../../../application/use-cases/MarkAllNotificationsRead";
import { NotificationDispatcher } from "../../../application/services/NotificationDispatcher";
import { PrismaNotificationRepository } from "../../repositories/PrismaNotificationRepository";
import { PrismaProspectRepository } from "../../repositories/PrismaProspectRepository";
import { PrismaErrorConfigRepository } from "../../repositories/PrismaErrorConfigRepository";
import { AuthController } from "../../../interfaces/http/controllers/AuthController";
import { UserController } from "../../../interfaces/http/controllers/UserController";
import { WorkspaceController } from "../../../interfaces/http/controllers/WorkspaceController";
import { StatsController } from "../../../interfaces/http/controllers/StatsController";
import { ProjectController } from "../../../interfaces/http/controllers/ProjectController";
import { TaskController } from "../../../interfaces/http/controllers/TaskController";
import { ClientController } from "../../../interfaces/http/controllers/ClientController";
import { ErrorController } from "../../../interfaces/http/controllers/ErrorController";
import { ApiKeyController } from "../../../interfaces/http/controllers/ApiKeyController";
import { NotificationController } from "../../../interfaces/http/controllers/NotificationController";
import { ProspectController } from "../../../interfaces/http/controllers/ProspectController";
import { ErrorConfigController } from "../../../interfaces/http/controllers/ErrorConfigController";
import { buildAuthMiddleware } from "./middleware/authMiddleware";
import { notFoundHandler, buildErrorHandler } from "./middleware/errorHandler";
import { buildRequestLoggerMiddleware } from "./middleware/requestLogger";
import { PrismaRequestLogRepository } from "../../repositories/PrismaRequestLogRepository";
import { ListRequestLogs } from "../../../application/use-cases/ListRequestLogs";
import { RequestLogController } from "../../../interfaces/http/controllers/RequestLogController";
import { buildRequestLogRoutes } from "./routes/requestLogRoutes";
import { buildAuthRoutes } from "./routes/authRoutes";
import { buildUserRoutes } from "./routes/userRoutes";
import { buildWorkspaceRoutes } from "./routes/workspaceRoutes";
import { buildProjectRoutes } from "./routes/projectRoutes";
import { buildTaskRoutes } from "./routes/taskRoutes";
import { buildClientRoutes } from "./routes/clientRoutes";
import { buildErrorRoutes } from "./routes/errorRoutes";
import { buildApiKeyRoutes } from "./routes/apiKeyRoutes";
import { buildStatsRoutes } from "./routes/statsRoutes";
import { buildNotificationRoutes } from "./routes/notificationRoutes";
import { buildProspectRoutes } from "./routes/prospectRoutes";
import { buildErrorConfigRoutes } from "./routes/errorConfigRoutes";
import { buildCompanionRoutes } from "./routes/companionRoutes";
import { CreateMPPreference } from "../../../application/use-cases/CreateMPPreference";
import { GetMPPayment } from "../../../application/use-cases/GetMPPayment";
import { HandleMPWebhook } from "../../../application/use-cases/HandleMPWebhook";
import { ListMPConfigs } from "../../../application/use-cases/ListMPConfigs";
import { CreateMPConfig } from "../../../application/use-cases/CreateMPConfig";
import { UpdateMPConfig } from "../../../application/use-cases/UpdateMPConfig";
import { DeleteMPConfig } from "../../../application/use-cases/DeleteMPConfig";
import { ListMPLogs } from "../../../application/use-cases/ListMPLogs";
import { PrismaMercadoPagoConfigRepository } from "../../repositories/PrismaMercadoPagoConfigRepository";
import { PrismaMercadoPagoLogRepository } from "../../repositories/PrismaMercadoPagoLogRepository";
import { MPController } from "../../../interfaces/http/controllers/MPController";
import { buildMPRoutes } from "./routes/mpRoutes";
import { CreateArcaConfig } from "../../../application/use-cases/CreateArcaConfig";
import { UpdateArcaConfig } from "../../../application/use-cases/UpdateArcaConfig";
import { DeleteArcaConfig } from "../../../application/use-cases/DeleteArcaConfig";
import { ListArcaConfigs } from "../../../application/use-cases/ListArcaConfigs";
import { AssignApiKeyToArcaConfig } from "../../../application/use-cases/AssignApiKeyToArcaConfig";
import { UnassignApiKeyFromArcaConfig } from "../../../application/use-cases/UnassignApiKeyFromArcaConfig";
import { CreateArcaVoucher } from "../../../application/use-cases/CreateArcaVoucher";
import { GetArcaSalesPoints } from "../../../application/use-cases/GetArcaSalesPoints";
import { GetArcaTaxpayer } from "../../../application/use-cases/GetArcaTaxpayer";
import { ListArcaLogs } from "../../../application/use-cases/ListArcaLogs";
import { NotifyArcaCertExpiry } from "../../../application/use-cases/NotifyArcaCertExpiry";
import { GenerateVoucherPdf } from "../../../application/use-cases/GenerateVoucherPdf";
import { PrismaArcaConfigRepository } from "../../repositories/PrismaArcaConfigRepository";
import { PrismaArcaLogRepository } from "../../repositories/PrismaArcaLogRepository";
import { EncryptionService } from "../../services/EncryptionService";
import { ArcaController } from "../../../interfaces/http/controllers/ArcaController";
import { buildArcaRoutes } from "./routes/arcaRoutes";
import { CreateWhatsAppConfig } from "../../../application/use-cases/CreateWhatsAppConfig";
import { ListWhatsAppConfigs } from "../../../application/use-cases/ListWhatsAppConfigs";
import { UpdateWhatsAppConfig } from "../../../application/use-cases/UpdateWhatsAppConfig";
import { DeleteWhatsAppConfig } from "../../../application/use-cases/DeleteWhatsAppConfig";
import { AssignApiKeyToWhatsAppConfig } from "../../../application/use-cases/AssignApiKeyToWhatsAppConfig";
import { UnassignApiKeyFromWhatsAppConfig } from "../../../application/use-cases/UnassignApiKeyFromWhatsAppConfig";
import { SendWhatsAppMessage } from "../../../application/use-cases/SendWhatsAppMessage";
import { HandleWhatsAppWebhook } from "../../../application/use-cases/HandleWhatsAppWebhook";
import { ListWhatsAppMessages } from "../../../application/use-cases/ListWhatsAppMessages";
import { ListWhatsAppLogs } from "../../../application/use-cases/ListWhatsAppLogs";
import { PrismaWhatsAppConfigRepository } from "../../repositories/PrismaWhatsAppConfigRepository";
import { PrismaWhatsAppMessageRepository } from "../../repositories/PrismaWhatsAppMessageRepository";
import { PrismaWhatsAppLogRepository } from "../../repositories/PrismaWhatsAppLogRepository";
import { WhatsAppController } from "../../../interfaces/http/controllers/WhatsAppController";
import { buildWhatsAppRoutes } from "./routes/whatsAppRoutes";
import { PrismaBrandRepository } from "../../repositories/PrismaBrandRepository";
import { PrismaIgTemplateRepository } from "../../repositories/PrismaIgTemplateRepository";
import { PrismaIgPostRepository } from "../../repositories/PrismaIgPostRepository";
import { PrismaIgBatchJobRepository } from "../../repositories/PrismaIgBatchJobRepository";
import { CreateBrand } from "../../../application/use-cases/CreateBrand";
import { ListBrands } from "../../../application/use-cases/ListBrands";
import { GetBrand } from "../../../application/use-cases/GetBrand";
import { UpdateBrand } from "../../../application/use-cases/UpdateBrand";
import { DeleteBrand } from "../../../application/use-cases/DeleteBrand";
import { CreateIgExamplePost } from "../../../application/use-cases/CreateIgExamplePost";
import { DeleteIgExamplePost } from "../../../application/use-cases/DeleteIgExamplePost";
import { ListIgExamplePosts } from "../../../application/use-cases/ListIgExamplePosts";
import { CreateIgTemplate } from "../../../application/use-cases/CreateIgTemplate";
import { UpdateIgTemplate } from "../../../application/use-cases/UpdateIgTemplate";
import { DeleteIgTemplate } from "../../../application/use-cases/DeleteIgTemplate";
import { ListIgTemplates } from "../../../application/use-cases/ListIgTemplates";
import { GenerateIgPosts } from "../../../application/use-cases/GenerateIgPosts";
import { CheckBatchStatus } from "../../../application/use-cases/CheckBatchStatus";
import { SummarizeIgTemplates } from "../../../application/use-cases/SummarizeIgTemplates";
import { CheckTemplateSummaryBatch } from "../../../application/use-cases/CheckTemplateSummaryBatch";
import { ListIgPosts } from "../../../application/use-cases/ListIgPosts";
import { GetIgPost } from "../../../application/use-cases/GetIgPost";
import { ApproveIgPost } from "../../../application/use-cases/ApproveIgPost";
import { RejectIgPost } from "../../../application/use-cases/RejectIgPost";
import { ListIgBatchJobs } from "../../../application/use-cases/ListIgBatchJobs";
import { GetIgBatchJob } from "../../../application/use-cases/GetIgBatchJob";
import { ListIgCostLogs } from "../../../application/use-cases/ListIgCostLogs";
import { SynthesizeBrandLearning } from "../../../application/use-cases/SynthesizeBrandLearning";
import { CheckSynthesisBatch } from "../../../application/use-cases/CheckSynthesisBatch";
import { ConnectIgAccount } from "../../../application/use-cases/ConnectIgAccount";
import { UploadIgPostImage } from "../../../application/use-cases/UploadIgPostImage";
import { PublishIgPost } from "../../../application/use-cases/PublishIgPost";
import { SyncIgPostMetrics } from "../../../application/use-cases/SyncIgPostMetrics";
import { MetaGraphService } from "../../services/MetaGraphService";
import { BrandController } from "../../../interfaces/http/controllers/BrandController";
import { IgController } from "../../../interfaces/http/controllers/IgController";
import { buildBrandRoutes } from "./routes/brandRoutes";
import { buildIgRoutes } from "./routes/igRoutes";
import { CreateContactRequest } from "../../../application/use-cases/CreateContactRequest";
import { ListContactRequests } from "../../../application/use-cases/ListContactRequests";
import { UpdateContactRequestStatus } from "../../../application/use-cases/UpdateContactRequestStatus";
import { PrismaContactRequestRepository } from "../../repositories/PrismaContactRequestRepository";
import { ContactController } from "../../../interfaces/http/controllers/ContactController";
import { buildContactRoutes } from "./routes/contactRoutes";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "../swagger/openapi";
import { buildHealthResponse } from "./health";

export const buildServer = (): Express => {
  const app = express();

  const corsOptions: cors.CorsOptions =
    env.corsAllowedOrigins.length > 0
      ? {
          origin: env.corsAllowedOrigins,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          allowedHeaders: ["Authorization", "Content-Type", "x-api-key"],
          optionsSuccessStatus: 204,
        }
      : {
          origin: true,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          allowedHeaders: ["Authorization", "Content-Type", "x-api-key"],
          optionsSuccessStatus: 204,
        };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json());
  app.use("/uploads", express.static("public/uploads"));

  const requestLogRepository = new PrismaRequestLogRepository();
  app.use(buildRequestLoggerMiddleware(requestLogRepository));

  app.get("/health", (_req, res) => {
    res.json(buildHealthResponse(env.appVersion));
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Repositories
  const userRepository      = new PrismaUserRepository();
  const sessionRepository   = new PrismaSessionRepository();
  const workspaceRepository = new PrismaWorkspaceRepository();
  const projectRepository = new PrismaProjectRepository();
  const taskRepository    = new PrismaTaskRepository();
  const clientRepository  = new PrismaClientRepository();
  const errorRepository   = new PrismaAppErrorRepository();
  const apiKeyRepository          = new PrismaApiKeyRepository();
  const notificationRepository    = new PrismaNotificationRepository();
  const errorConfigRepository     = new PrismaErrorConfigRepository();
  const prospectRepository        = new PrismaProspectRepository();
  const mailConfigRepository      = new PrismaMailConfigRepository();
  const mailTemplateRepository    = new PrismaMailTemplateRepository();
  const mailLogRepository         = new PrismaMailLogRepository();
  const mpConfigRepository        = new PrismaMercadoPagoConfigRepository();
  const mpLogRepository           = new PrismaMercadoPagoLogRepository();
  const encryptionService         = new EncryptionService(env.arcaEncryptionKey);
  const arcaConfigRepository      = new PrismaArcaConfigRepository(encryptionService);
  const arcaLogRepository         = new PrismaArcaLogRepository();
  const contactRequestRepository  = new PrismaContactRequestRepository();

  // Services
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService   = new JwtTokenService();

  const statsRepository = new PrismaStatsRepository();

  // Auth use cases + controller
  const registerUser   = new RegisterUser(userRepository, passwordHasher, tokenService);
  const loginUser      = new LoginUser(userRepository, passwordHasher, tokenService);
  const forgotPassword = new ForgotPassword(userRepository);
  const resetPassword  = new ResetPassword(userRepository, passwordHasher);
  const authController = new AuthController(registerUser, loginUser, forgotPassword, resetPassword, sessionRepository);

  // User use cases + controller
  const listUsers          = new ListUsers(userRepository);
  const updateUser         = new UpdateUser(userRepository);
  const changePassword     = new ChangePassword(userRepository, passwordHasher);
  const getActiveSessions  = new GetActiveSessions(sessionRepository);
  const revokeSession      = new RevokeSession(sessionRepository);
  const userController = new UserController(listUsers, registerUser, userRepository, updateUser, changePassword, getActiveSessions, revokeSession);

  // Workspace use cases + controller
  const getWorkspace    = new GetWorkspace(workspaceRepository);
  const updateWorkspace = new UpdateWorkspace(workspaceRepository);
  const workspaceController = new WorkspaceController(getWorkspace, updateWorkspace);

  // Stats use cases + controller
  const getOverviewStats = new GetOverviewStats(statsRepository);
  const getReportStats   = new GetReportStats(statsRepository);
  const statsController  = new StatsController(getOverviewStats, getReportStats);

  // Notification use cases + dispatcher + controller
  const createNotification       = new CreateNotification(notificationRepository);
  const getNotifications         = new GetNotifications(notificationRepository);
  const getUnreadCount           = new GetUnreadCount(notificationRepository);
  const markNotificationRead     = new MarkNotificationRead(notificationRepository);
  const markAllNotificationsRead = new MarkAllNotificationsRead(notificationRepository);
  const notificationDispatcher   = new NotificationDispatcher(userRepository, createNotification);
  const notificationController   = new NotificationController(getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead);

  // Project use cases + controller
  const createProject = new CreateProject(projectRepository);
  const listProjects  = new ListProjects(projectRepository);
  const getProject    = new GetProject(projectRepository);
  const updateProject = new UpdateProject(projectRepository);
  const deleteProject = new DeleteProject(projectRepository);
  const projectController = new ProjectController(createProject, listProjects, getProject, updateProject, deleteProject, notificationDispatcher);

  // Task use cases + controller
  const createTask         = new CreateTask(taskRepository);
  const listTasksByProject = new ListTasksByProject(taskRepository);
  const updateTask         = new UpdateTask(taskRepository);
  const deleteTask         = new DeleteTask(taskRepository);
  const taskController = new TaskController(createTask, listTasksByProject, updateTask, deleteTask, notificationDispatcher, taskRepository);

  // Client use cases + controller
  const createClient = new CreateClient(clientRepository);
  const listClients  = new ListClients(clientRepository);
  const getClient    = new GetClient(clientRepository);
  const updateClient = new UpdateClient(clientRepository);
  const deleteClient = new DeleteClient(clientRepository);
  const clientController = new ClientController(createClient, listClients, getClient, updateClient, deleteClient);

  // Error use cases + controller
  const ingestError       = new IngestError(errorRepository);
  const listErrors        = new ListErrors(errorRepository);
  const getError          = new GetError(errorRepository);
  const updateErrorStatus = new UpdateErrorStatus(errorRepository);
  const deleteError       = new DeleteError(errorRepository);
  const errorController   = new ErrorController(ingestError, listErrors, getError, updateErrorStatus, deleteError);

  // Prospect use cases + controller
  const createProspect      = new CreateProspect(prospectRepository);
  const bulkCreateProspects = new BulkCreateProspects(prospectRepository);
  const listProspects       = new ListProspects(prospectRepository);
  const updateProspect      = new UpdateProspect(prospectRepository);
  const deleteProspect      = new DeleteProspect(prospectRepository);
  const prospectController  = new ProspectController(createProspect, bulkCreateProspects, listProspects, updateProspect, deleteProspect);

  // ErrorConfig use cases + controller
  const createErrorConfig = new CreateErrorConfig(errorConfigRepository);
  const listErrorConfigs  = new ListErrorConfigs(errorConfigRepository);
  const getErrorConfig    = new GetErrorConfig(errorConfigRepository);
  const deleteErrorConfig = new DeleteErrorConfig(errorConfigRepository);
  const errorConfigController = new ErrorConfigController(createErrorConfig, listErrorConfigs, getErrorConfig, deleteErrorConfig);

  // API key use cases + controller
  const createApiKey = new CreateApiKey(apiKeyRepository);
  const listApiKeys  = new ListApiKeys(apiKeyRepository);
  const revokeApiKey = new RevokeApiKey(apiKeyRepository);
  const apiKeyController = new ApiKeyController(createApiKey, listApiKeys, revokeApiKey);

  // Mail use cases + controller
  const sendMail           = new SendMail(mailConfigRepository, mailTemplateRepository, mailLogRepository);
  const listMailConfigs    = new ListMailConfigs(mailConfigRepository);
  const createMailConfig   = new CreateMailConfig(mailConfigRepository);
  const updateMailConfig   = new UpdateMailConfig(mailConfigRepository);
  const deleteMailConfig   = new DeleteMailConfig(mailConfigRepository);
  const listMailLogs       = new ListMailLogs(mailLogRepository);
  const listMailTemplates  = new ListMailTemplates(mailTemplateRepository);
  const createMailTemplate = new CreateMailTemplate(mailTemplateRepository);
  const updateMailTemplate = new UpdateMailTemplate(mailTemplateRepository);
  const deleteMailTemplate = new DeleteMailTemplate(mailTemplateRepository);
  const mailController     = new MailController(sendMail, listMailConfigs, createMailConfig, updateMailConfig, deleteMailConfig, listMailLogs, listMailTemplates, createMailTemplate, updateMailTemplate, deleteMailTemplate);

  // MercadoPago use cases + controller
  const createMPPreference = new CreateMPPreference(mpConfigRepository, mpLogRepository);
  const getMPPayment       = new GetMPPayment(mpConfigRepository);
  const handleMPWebhook    = new HandleMPWebhook(mpConfigRepository, mpLogRepository);
  const listMPConfigs      = new ListMPConfigs(mpConfigRepository);
  const createMPConfig     = new CreateMPConfig(mpConfigRepository);
  const updateMPConfig     = new UpdateMPConfig(mpConfigRepository);
  const deleteMPConfig     = new DeleteMPConfig(mpConfigRepository);
  const listMPLogs         = new ListMPLogs(mpLogRepository);
  const mpController       = new MPController(createMPPreference, getMPPayment, handleMPWebhook, listMPConfigs, createMPConfig, updateMPConfig, deleteMPConfig, listMPLogs);

  // ARCA use cases + controller
  const createArcaConfig          = new CreateArcaConfig(arcaConfigRepository);
  const updateArcaConfig          = new UpdateArcaConfig(arcaConfigRepository);
  const deleteArcaConfig          = new DeleteArcaConfig(arcaConfigRepository);
  const listArcaConfigs           = new ListArcaConfigs(arcaConfigRepository);
  const assignApiKeyToArcaConfig  = new AssignApiKeyToArcaConfig(arcaConfigRepository);
  const unassignApiKeyFromArcaConfig = new UnassignApiKeyFromArcaConfig(arcaConfigRepository);
  const createArcaVoucher         = new CreateArcaVoucher(arcaConfigRepository, arcaLogRepository);
  const getArcaSalesPoints        = new GetArcaSalesPoints(arcaConfigRepository, arcaLogRepository);
  const getArcaTaxpayer           = new GetArcaTaxpayer(arcaConfigRepository, arcaLogRepository);
  const listArcaLogs              = new ListArcaLogs(arcaLogRepository);
  const notifyArcaCertExpiry      = new NotifyArcaCertExpiry(arcaConfigRepository, userRepository, notificationRepository);
  const generateVoucherPdf        = new GenerateVoucherPdf(arcaConfigRepository, arcaLogRepository);
  const arcaController = new ArcaController(createArcaConfig, updateArcaConfig, deleteArcaConfig, listArcaConfigs, assignApiKeyToArcaConfig, unassignApiKeyFromArcaConfig, createArcaVoucher, getArcaSalesPoints, getArcaTaxpayer, listArcaLogs, notifyArcaCertExpiry, generateVoucherPdf);

  // WhatsApp use cases + controller
  const waConfigRepository  = new PrismaWhatsAppConfigRepository();
  const waMessageRepository = new PrismaWhatsAppMessageRepository();
  const waLogRepository     = new PrismaWhatsAppLogRepository();
  const createWhatsAppConfig          = new CreateWhatsAppConfig(waConfigRepository);
  const listWhatsAppConfigs           = new ListWhatsAppConfigs(waConfigRepository);
  const updateWhatsAppConfig          = new UpdateWhatsAppConfig(waConfigRepository);
  const deleteWhatsAppConfig          = new DeleteWhatsAppConfig(waConfigRepository);
  const assignApiKeyToWhatsApp        = new AssignApiKeyToWhatsAppConfig(waConfigRepository);
  const unassignApiKeyFromWhatsApp    = new UnassignApiKeyFromWhatsAppConfig(waConfigRepository);
  const sendWhatsAppMessage           = new SendWhatsAppMessage(waConfigRepository, waMessageRepository, waLogRepository);
  const handleWhatsAppWebhook         = new HandleWhatsAppWebhook(waConfigRepository, waMessageRepository);
  const listWhatsAppMessages          = new ListWhatsAppMessages(waMessageRepository);
  const listWhatsAppLogs              = new ListWhatsAppLogs(waLogRepository);
  const whatsAppController = new WhatsAppController(createWhatsAppConfig, listWhatsAppConfigs, updateWhatsAppConfig, deleteWhatsAppConfig, assignApiKeyToWhatsApp, unassignApiKeyFromWhatsApp, sendWhatsAppMessage, handleWhatsAppWebhook, listWhatsAppMessages, listWhatsAppLogs);

  // Middleware
  const authMiddleware       = buildAuthMiddleware(tokenService, sessionRepository);
  const ingestKeyMiddleware  = buildIngestKeyMiddleware(apiKeyRepository);

  // Routes
  app.use(buildAuthRoutes(authController));
  app.use(buildStatsRoutes(statsController, authMiddleware));
  app.use(buildErrorRoutes(errorController, authMiddleware, apiKeyRepository));
  app.use(buildUserRoutes(userController, authMiddleware));
  app.use(buildWorkspaceRoutes(workspaceController, authMiddleware));
  app.use(buildApiKeyRoutes(apiKeyController, authMiddleware));
  app.use(buildNotificationRoutes(notificationController, authMiddleware));
  app.use(buildProspectRoutes(prospectController, authMiddleware));
  app.use(buildErrorConfigRoutes(errorConfigController, authMiddleware));
  app.use(buildCompanionRoutes(authMiddleware));
  app.use(buildMailRoutes(mailController, authMiddleware, ingestKeyMiddleware));
  app.use(buildMPRoutes(mpController, authMiddleware, ingestKeyMiddleware));
  app.use(buildArcaRoutes(arcaController, authMiddleware, ingestKeyMiddleware));
  app.use(buildWhatsAppRoutes(whatsAppController, authMiddleware, ingestKeyMiddleware));
  app.use(buildProjectRoutes(projectController, taskController, authMiddleware));
  app.use(buildTaskRoutes(taskController, authMiddleware));
  app.use(buildClientRoutes(clientController, authMiddleware));

  // Instagram Generator use cases + controllers
  const brandRepository       = new PrismaBrandRepository();
  const igTemplateRepository  = new PrismaIgTemplateRepository();
  const igPostRepository      = new PrismaIgPostRepository();
  const igBatchJobRepository  = new PrismaIgBatchJobRepository();
  const createBrand        = new CreateBrand(brandRepository);
  const listBrands         = new ListBrands(brandRepository);
  const getBrand           = new GetBrand(brandRepository);
  const updateBrand        = new UpdateBrand(brandRepository);
  const deleteBrand        = new DeleteBrand(brandRepository);
  const createIgExample    = new CreateIgExamplePost(brandRepository);
  const deleteIgExample    = new DeleteIgExamplePost();
  const listIgExamples     = new ListIgExamplePosts();

  const createIgTemplate   = new CreateIgTemplate(igTemplateRepository);
  const updateIgTemplate   = new UpdateIgTemplate(igTemplateRepository);
  const deleteIgTemplate   = new DeleteIgTemplate(igTemplateRepository);
  const listIgTemplates    = new ListIgTemplates(igTemplateRepository);

  const generateIgPosts    = new GenerateIgPosts(brandRepository, igTemplateRepository, igPostRepository, igBatchJobRepository);
  const checkBatchStatus   = new CheckBatchStatus(igBatchJobRepository, igPostRepository, igTemplateRepository);
  const summarizeTemplates = new SummarizeIgTemplates(igTemplateRepository);
  const checkSummaryBatch  = new CheckTemplateSummaryBatch(igTemplateRepository);

  const listIgPosts             = new ListIgPosts(igPostRepository);
  const getIgPost               = new GetIgPost(igPostRepository);
  const approveIgPost           = new ApproveIgPost(igPostRepository);
  const rejectIgPost            = new RejectIgPost(igPostRepository);
  const listIgBatchJobs         = new ListIgBatchJobs(igBatchJobRepository);
  const getIgBatchJob           = new GetIgBatchJob(igBatchJobRepository);
  const listIgCostLogs          = new ListIgCostLogs();
  const synthesizeBrandLearning = new SynthesizeBrandLearning();
  const checkSynthesisBatch     = new CheckSynthesisBatch();
  const metaGraphService        = new MetaGraphService();
  const connectIgAccount        = new ConnectIgAccount(brandRepository, encryptionService);
  const uploadIgPostImage       = new UploadIgPostImage(igPostRepository);
  const syncIgPostMetrics       = new SyncIgPostMetrics(igPostRepository, brandRepository, metaGraphService, encryptionService);
  const publishIgPost           = new PublishIgPost(igPostRepository, brandRepository, metaGraphService, encryptionService, syncIgPostMetrics);

  const brandController = new BrandController(createBrand, listBrands, getBrand, updateBrand, deleteBrand, createIgExample, deleteIgExample, listIgExamples);
  const igController    = new IgController(createIgTemplate, updateIgTemplate, deleteIgTemplate, listIgTemplates, generateIgPosts, checkBatchStatus, summarizeTemplates, checkSummaryBatch, listIgPosts, getIgPost, approveIgPost, rejectIgPost, listIgBatchJobs, getIgBatchJob, listIgCostLogs, synthesizeBrandLearning, checkSynthesisBatch, connectIgAccount, uploadIgPostImage, publishIgPost, syncIgPostMetrics);

  // Contact requests use cases + controller
  const createContactRequest       = new CreateContactRequest(contactRequestRepository);
  const listContactRequests        = new ListContactRequests(contactRequestRepository);
  const updateContactRequestStatus = new UpdateContactRequestStatus(contactRequestRepository);
  const contactController = new ContactController(createContactRequest, listContactRequests, updateContactRequestStatus);

  // Request logs
  const listRequestLogs      = new ListRequestLogs(requestLogRepository);
  const requestLogController = new RequestLogController(listRequestLogs);
  app.use(buildBrandRoutes(brandController, authMiddleware));
  app.use(buildIgRoutes(igController, authMiddleware));
  app.use(buildContactRoutes(contactController, authMiddleware));
  app.use(buildRequestLogRoutes(requestLogController, authMiddleware));

  app.use(notFoundHandler);
  app.use(buildErrorHandler());

  return app;
};

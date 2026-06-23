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
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
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

export const buildServer = (): Express => {
  const app = express();

  const corsOptions: cors.CorsOptions =
    env.corsAllowedOrigins.length > 0
      ? {
          origin: env.corsAllowedOrigins,
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          allowedHeaders: ["Authorization", "Content-Type"],
          optionsSuccessStatus: 204,
        }
      : {
          origin: true,
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          allowedHeaders: ["Authorization", "Content-Type"],
          optionsSuccessStatus: 204,
        };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json());

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

  // Middleware
  const authMiddleware = buildAuthMiddleware(tokenService, sessionRepository);

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
  app.use(buildProjectRoutes(projectController, taskController, authMiddleware));
  app.use(buildTaskRoutes(taskController, authMiddleware));
  app.use(buildClientRoutes(clientController, authMiddleware));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

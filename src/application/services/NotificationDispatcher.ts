import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { CreateNotification } from "../use-cases/CreateNotification";

export class NotificationDispatcher {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly createNotification: CreateNotification
  ) {}

  async newProject(projectId: string, projectName: string, creatorId: string): Promise<void> {
    const allUsers = await this.userRepository.list();
    for (const user of allUsers) {
      if (user.id === creatorId) continue;
      const prefs = await this.userRepository.getNotifications(user.id);
      if (!prefs["new-project"]) continue;
      await this.createNotification.execute({
        userId: user.id,
        type: "new-project",
        title: "Nuevo proyecto",
        body: `Se creó el proyecto "${projectName}"`,
        entityId: projectId,
      });
    }
  }

  async taskAssigned(taskId: string, taskTitle: string, assigneeId: string): Promise<void> {
    const prefs = await this.userRepository.getNotifications(assigneeId);
    if (!prefs["task-assigned"]) return;
    await this.createNotification.execute({
      userId: assigneeId,
      type: "task-assigned",
      title: "Tarea asignada",
      body: `Se te asignó "${taskTitle}"`,
      entityId: taskId,
    });
  }
}

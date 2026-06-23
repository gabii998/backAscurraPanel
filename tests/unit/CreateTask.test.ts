import { CreateTask } from "../../src/application/use-cases/CreateTask";
import type { TaskRepository } from "../../src/domain/repositories/TaskRepository";
import type { Task } from "../../src/domain/entities/Task";

const makeRepo = (): TaskRepository => ({
  findById: jest.fn(),
  listByProject: jest.fn(),
  create: jest.fn().mockImplementation(async (t: Task) => t),
  update: jest.fn(),
  softDelete: jest.fn(),
});

describe("CreateTask", () => {
  it("creates a task with defaults", async () => {
    const repo = makeRepo();
    const uc = new CreateTask(repo);

    const task = await uc.execute({ projectId: "p1", title: "Setup CI" });

    expect(task.title).toBe("Setup CI");
    expect(task.priority).toBe("medium");
    expect(task.column).toBe("backlog");
    expect(task.description).toBe("");
    expect(task.labels).toEqual([]);
    expect(task.assigneeId).toBeNull();
  });

  it("respects overridden fields", async () => {
    const repo = makeRepo();
    const uc = new CreateTask(repo);

    const task = await uc.execute({
      projectId: "p1",
      title: "Deploy prod",
      priority: "critical",
      column: "progress",
      assigneeId: "u1",
    });

    expect(task.priority).toBe("critical");
    expect(task.column).toBe("progress");
    expect(task.assigneeId).toBe("u1");
  });
});

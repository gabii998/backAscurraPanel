import { CreateProject } from "../../src/application/use-cases/CreateProject";
import type { ProjectRepository } from "../../src/domain/repositories/ProjectRepository";
import type { Project } from "../../src/domain/entities/Project";

const makeRepo = (): ProjectRepository => ({
  findById: jest.fn(),
  list: jest.fn(),
  create: jest.fn().mockImplementation(async (p: Project) => p),
  update: jest.fn(),
  softDelete: jest.fn(),
});

describe("CreateProject", () => {
  it("creates a project with defaults", async () => {
    const repo = makeRepo();
    const uc = new CreateProject(repo);

    const project = await uc.execute({ name: "Portal Web", stack: "Angular + Node" });

    expect(project.name).toBe("Portal Web");
    expect(project.status).toBe("active");
    expect(project.progress).toBe(0);
    expect(project.memberIds).toEqual([]);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("passes memberIds to the repository", async () => {
    const repo = makeRepo();
    const uc = new CreateProject(repo);

    const project = await uc.execute({
      name: "App Móvil",
      stack: "React Native",
      memberIds: ["u1", "u2"],
    });

    expect(project.memberIds).toEqual(["u1", "u2"]);
  });
});

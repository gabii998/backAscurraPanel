import { validateProjectColumns, DEFAULT_PROJECT_COLUMNS } from "../../src/domain/entities/ProjectColumn";
import { CreateTask } from "../../src/application/use-cases/CreateTask";
import type { ProjectRepository } from "../../src/domain/repositories/ProjectRepository";
import type { TaskRepository } from "../../src/domain/repositories/TaskRepository";

describe("Project columns", () => {
  it("accepts reordered and renamed columns preserving IDs", () => {
    const columns = [{ id: "done", label: " Shipped ", color: "#22c55e" }, { id: "qa", label: "QA", color: "#123456" }];
    expect(validateProjectColumns(columns)[0]).toEqual({ ...columns[0], label: "Shipped" });
  });
  it.each([[], [{id: 'a', label: 'A', color: '#123456'}], [...DEFAULT_PROJECT_COLUMNS, DEFAULT_PROJECT_COLUMNS[0]], [...DEFAULT_PROJECT_COLUMNS, {id:'bad',label:' ',color:'#123456'}]].map(columns => [columns]))("rejects invalid columns or removal of completed column", columns => {
    expect(() => validateProjectColumns(columns)).toThrow();
  });
  it("creates in the first configured column when no column is supplied", async () => {
    const create = jest.fn().mockImplementation(task => Promise.resolve(task));
    const projects = { findById: jest.fn().mockResolvedValue({ id: 'p', columns: [{id:'qa',label:'QA',color:'#123456'},DEFAULT_PROJECT_COLUMNS[3]] }) } as unknown as ProjectRepository;
    const uc = new CreateTask({ create } as unknown as TaskRepository, projects);
    expect((await uc.execute({projectId:'p',title:'Issue'})).column).toBe('qa');
    await expect(uc.execute({projectId:'p',title:'Issue',column:'backlog'})).rejects.toThrow('INVALID_TASK_COLUMN');
    expect(create).toHaveBeenCalledTimes(1);
  });
});

import request from "supertest";
import { setup, teardown, cleanDb, app } from "./helpers";

beforeAll(async () => { await setup(); });
afterEach(async () => { await cleanDb(); });
afterAll(async () => { await teardown(); });

let token: string;
let projectId: string;

beforeEach(async () => {
  const authRes = await request(app).post("/auth/register").send({
    name: "Admin",
    email: "admin@example.com",
    password: "pass",
    initials: "A",
    color: "#000",
  });
  token = authRes.body.token as string;

  const projRes = await request(app).post("/projects").set({ Authorization: `Bearer ${token}` }).send({ name: "Test", stack: "Node" });
  projectId = projRes.body.id as string;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe("POST /projects/:id/tasks", () => {
  it("creates a task", async () => {
    const res = await request(app).post(`/projects/${projectId}/tasks`).set(auth()).send({ title: "Write tests" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Write tests");
    expect(res.body.column).toBe("backlog");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app).post(`/projects/${projectId}/tasks`).set(auth()).send({ priority: "high" });
    expect(res.status).toBe(400);
  });
});

describe("GET /projects/:id/tasks", () => {
  it("lists tasks for a project", async () => {
    await request(app).post(`/projects/${projectId}/tasks`).set(auth()).send({ title: "Task 1" });
    await request(app).post(`/projects/${projectId}/tasks`).set(auth()).send({ title: "Task 2" });

    const res = await request(app).get(`/projects/${projectId}/tasks`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("PUT /tasks/:id", () => {
  it("moves a task to a different column", async () => {
    const created = await request(app).post(`/projects/${projectId}/tasks`).set(auth()).send({ title: "Task" });
    const res = await request(app).put(`/tasks/${created.body.id}`).set(auth()).send({ column: "done" });
    expect(res.status).toBe(200);
    expect(res.body.column).toBe("done");
  });
});

describe("DELETE /tasks/:id", () => {
  it("soft-deletes a task", async () => {
    const created = await request(app).post(`/projects/${projectId}/tasks`).set(auth()).send({ title: "Task" });
    const del = await request(app).delete(`/tasks/${created.body.id}`).set(auth());
    expect(del.status).toBe(204);

    const tasks = await request(app).get(`/projects/${projectId}/tasks`).set(auth());
    expect(tasks.body).toHaveLength(0);
  });
});

import request from "supertest";
import { setup, teardown, cleanDb, app } from "./helpers";

beforeAll(async () => { await setup(); });
afterEach(async () => { await cleanDb(); });
afterAll(async () => { await teardown(); });

let token: string;

beforeEach(async () => {
  const res = await request(app).post("/auth/register").send({
    name: "Admin",
    email: "admin@example.com",
    password: "pass",
    initials: "A",
    color: "#000",
  });
  token = res.body.token as string;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe("GET /projects", () => {
  it("returns empty list initially", async () => {
    const res = await request(app).get("/projects").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/projects");
    expect(res.status).toBe(401);
  });
});

describe("POST /projects", () => {
  it("creates a project", async () => {
    const res = await request(app)
      .post("/projects")
      .set(auth())
      .send({ name: "Portal Web", stack: "Angular" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Portal Web");
    expect(res.body.status).toBe("active");
    expect(res.body.id).toBeTruthy();
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/projects").set(auth()).send({ stack: "Vue" });
    expect(res.status).toBe(400);
  });
});

describe("GET /projects/:id", () => {
  it("returns a project by id", async () => {
    const created = await request(app).post("/projects").set(auth()).send({ name: "API", stack: "Node" });
    const res = await request(app).get(`/projects/${created.body.id}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("API");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/projects/nonexistent").set(auth());
    expect(res.status).toBe(404);
  });
});

describe("PUT /projects/:id", () => {
  it("updates a project", async () => {
    const created = await request(app).post("/projects").set(auth()).send({ name: "Old", stack: "Vue" });
    const res = await request(app).put(`/projects/${created.body.id}`).set(auth()).send({ name: "New" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New");
  });
});

describe("DELETE /projects/:id", () => {
  it("soft-deletes a project", async () => {
    const created = await request(app).post("/projects").set(auth()).send({ name: "To delete", stack: "X" });
    const del = await request(app).delete(`/projects/${created.body.id}`).set(auth());
    expect(del.status).toBe(204);

    const check = await request(app).get(`/projects/${created.body.id}`).set(auth());
    expect(check.status).toBe(404);
  });
});

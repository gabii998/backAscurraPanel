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

const validClient = {
  company: "Acme Corp",
  industry: "Tecnología",
  contactName: "Juan Pérez",
  contactEmail: "juan@acme.com",
  initials: "AC",
  color: "#6366f1",
};

describe("POST /clients", () => {
  it("creates a client", async () => {
    const res = await request(app).post("/clients").set(auth()).send(validClient);
    expect(res.status).toBe(201);
    expect(res.body.company).toBe("Acme Corp");
    expect(res.body.status).toBe("prospect");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/clients").set(auth()).send({ company: "X" });
    expect(res.status).toBe(400);
  });
});

describe("GET /clients", () => {
  it("lists clients", async () => {
    await request(app).post("/clients").set(auth()).send(validClient);
    const res = await request(app).get("/clients").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("filters by status", async () => {
    await request(app).post("/clients").set(auth()).send(validClient);
    await request(app).post("/clients").set(auth()).send({ ...validClient, company: "Beta", status: "active" });

    const res = await request(app).get("/clients?status=active").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].company).toBe("Beta");
  });
});

describe("GET /clients/:id", () => {
  it("returns a client", async () => {
    const created = await request(app).post("/clients").set(auth()).send(validClient);
    const res = await request(app).get(`/clients/${created.body.id}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.company).toBe("Acme Corp");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/clients/nonexistent").set(auth());
    expect(res.status).toBe(404);
  });
});

describe("PUT /clients/:id", () => {
  it("updates a client", async () => {
    const created = await request(app).post("/clients").set(auth()).send(validClient);
    const res = await request(app).put(`/clients/${created.body.id}`).set(auth()).send({ status: "active" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });
});

describe("DELETE /clients/:id", () => {
  it("soft-deletes a client", async () => {
    const created = await request(app).post("/clients").set(auth()).send(validClient);
    const del = await request(app).delete(`/clients/${created.body.id}`).set(auth());
    expect(del.status).toBe(204);

    const check = await request(app).get(`/clients/${created.body.id}`).set(auth());
    expect(check.status).toBe(404);
  });
});

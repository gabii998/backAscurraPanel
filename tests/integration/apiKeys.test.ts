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

describe("POST /api-keys", () => {
  it("creates a key and returns rawKey once", async () => {
    const res = await request(app).post("/api-keys").set(auth()).send({ name: "Web App" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Web App");
    expect(res.body.key).toMatch(/^aks_/);
    expect(res.body.prefix).toBe(res.body.key.slice(0, 8));
    expect(res.body).not.toHaveProperty("keyHash");
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app).post("/api-keys").set(auth()).send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).post("/api-keys").send({ name: "x" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api-keys", () => {
  it("lists created keys without exposing keyHash or rawKey", async () => {
    await request(app).post("/api-keys").set(auth()).send({ name: "Key A" });
    await request(app).post("/api-keys").set(auth()).send({ name: "Key B" });

    const res = await request(app).get("/api-keys").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty("keyHash");
    expect(res.body[0]).not.toHaveProperty("key");
    expect(res.body[0]).toHaveProperty("revokedAt");
  });
});

describe("DELETE /api-keys/:id (revoke)", () => {
  it("revokes a key so ingest returns 401", async () => {
    const createRes = await request(app).post("/api-keys").set(auth()).send({ name: "Mobile" });
    const { id, key } = createRes.body as { id: string; key: string };

    const revokeRes = await request(app).delete(`/api-keys/${id}`).set(auth());
    expect(revokeRes.status).toBe(204);

    const ingestRes = await request(app)
      .post("/errors/ingest")
      .set({ "x-api-key": key, "Content-Type": "application/json" })
      .send({ type: "TypeError", message: "test" });
    expect(ingestRes.status).toBe(401);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).delete("/api-keys/nonexistent").set(auth());
    expect(res.status).toBe(404);
  });
});

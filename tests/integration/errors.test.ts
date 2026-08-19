import request from "supertest";
import { setup, teardown, cleanDb, app } from "./helpers";

beforeAll(async () => { await setup(); });
afterEach(async () => { await cleanDb(); });
afterAll(async () => { await teardown(); });

let token: string;
let ingestKey: string;
let ingestKeyId: string;

beforeEach(async () => {
  const res = await request(app).post("/auth/register").send({
    name: "Admin",
    email: "admin@example.com",
    password: "pass",
    initials: "A",
    color: "#000",
  });
  token = res.body.token as string;

  const keyRes = await request(app)
    .post("/api-keys")
    .set({ Authorization: `Bearer ${token}` })
    .send({ name: "Test Key" });
  ingestKey = keyRes.body.key as string;
  ingestKeyId = keyRes.body.id as string;
});

const auth = () => ({ Authorization: `Bearer ${token}` });
const ingestHeaders = () => ({ "x-api-key": ingestKey, "Content-Type": "application/json" });

const validPayload = {
  type: "TypeError",
  message: "Cannot read properties of undefined",
  severity: "critical",
  stackTrace: "TypeError: ...\n  at App.ts:10",
  meta: {
    url: "/dashboard",
    browser: "Chrome 124",
    os: "macOS 14",
    user: "ana@example.com",
  },
};

describe("POST /errors/ingest", () => {
  it("returns 201 with a valid API key", async () => {
    const res = await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.type).toBe("TypeError");
    expect(res.body.severity).toBe("critical");
    expect(res.body.count).toBe(1);
    expect(res.body.usersAffected).toBe(1);
    expect(res.body.sparkline).toHaveLength(7);
  });

  it("returns 401 without API key", async () => {
    const res = await request(app).post("/errors/ingest").send(validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong API key", async () => {
    const res = await request(app).post("/errors/ingest").set({ "x-api-key": "wrong" }).send(validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 400 when type or message is missing", async () => {
    const res = await request(app).post("/errors/ingest").set(ingestHeaders()).send({ type: "TypeError" });
    expect(res.status).toBe(400);
  });

  it("deduplicates: second ingest of same error increments count", async () => {
    await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);
    const res = await request(app).post("/errors/ingest").set(ingestHeaders()).send({
      ...validPayload,
      meta: { ...validPayload.meta, user: "other@example.com" },
    });
    expect(res.status).toBe(201);

    const list = await request(app).get("/errors").set(auth());
    expect(list.body).toHaveLength(1);
    expect(list.body[0].count).toBe(2);
  });

  it("deduplicates: same user does not increment usersAffected", async () => {
    await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);
    await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);

    const list = await request(app).get("/errors").set(auth());
    expect(list.body[0].count).toBe(2);
    expect(list.body[0].usersAffected).toBe(1);
  });
});

describe("GET /errors", () => {
  beforeEach(async () => {
    await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);
    await request(app).post("/errors/ingest").set(ingestHeaders()).send({
      type: "NetworkError",
      message: "Failed to fetch",
      severity: "warning",
    });
  });

  it("lists all errors", async () => {
    const res = await request(app).get("/errors").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("filters by severity", async () => {
    const res = await request(app).get("/errors?severity=critical").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("TypeError");
  });

  it("filters by status", async () => {
    const res = await request(app).get("/errors?status=unresolved").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("filters errors by the selected configuration", async () => {
    const firstConfig = await request(app)
      .post("/error-configs")
      .set(auth())
      .send({ name: "Aplicación A" });
    const secondConfig = await request(app)
      .post("/error-configs")
      .set(auth())
      .send({ name: "Aplicación B" });

    await request(app).post("/errors/ingest").set(ingestHeaders()).send({
      type: "ConfigAError",
      message: "Error de la aplicación A",
      errorConfigId: firstConfig.body.id,
    });
    await request(app).post("/errors/ingest").set(ingestHeaders()).send({
      type: "ConfigBError",
      message: "Error de la aplicación B",
      errorConfigId: secondConfig.body.id,
    });

    const res = await request(app).get(`/errors?configId=${firstConfig.body.id}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("ConfigAError");
  });

  it("associates an ingested error with the configuration assigned to its API key", async () => {
    const config = await request(app)
      .post("/error-configs")
      .set(auth())
      .send({ name: "Aplicación con key", apiKeyId: ingestKeyId });

    const ingested = await request(app).post("/errors/ingest").set(ingestHeaders()).send({
      type: "ApiKeyError",
      message: "Se asocia usando la key",
    });

    expect(ingested.status).toBe(201);
    expect(ingested.body.errorConfigId).toBe(config.body.id);
  });

  it("does not allow an API key to be assigned to two error configurations", async () => {
    await request(app)
      .post("/error-configs")
      .set(auth())
      .send({ name: "Aplicación A", apiKeyId: ingestKeyId });

    const duplicate = await request(app)
      .post("/error-configs")
      .set(auth())
      .send({ name: "Aplicación B", apiKeyId: ingestKeyId });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe("API_KEY_ALREADY_ASSIGNED");
  });

  it("returns 401 without JWT", async () => {
    const res = await request(app).get("/errors");
    expect(res.status).toBe(401);
  });
});

describe("GET /errors/:id", () => {
  it("returns error with sparkline", async () => {
    await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);
    const list = await request(app).get("/errors").set(auth());
    const id = list.body[0].id as string;

    const res = await request(app).get(`/errors/${id}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.sparkline).toHaveLength(7);
    expect(res.body.metaUrl).toBe("/dashboard");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/errors/nonexistent").set(auth());
    expect(res.status).toBe(404);
  });
});

describe("PUT /errors/:id/status", () => {
  it("marks an error as resolved", async () => {
    await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);
    const list = await request(app).get("/errors").set(auth());
    const id = list.body[0].id as string;

    const res = await request(app).put(`/errors/${id}/status`).set(auth()).send({ status: "resolved" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("resolved");
  });

  it("returns 400 when status is missing", async () => {
    await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);
    const list = await request(app).get("/errors").set(auth());
    const id = list.body[0].id as string;

    const res = await request(app).put(`/errors/${id}/status`).set(auth()).send({});
    expect(res.status).toBe(400);
  });
});

describe("DELETE /errors/:id", () => {
  it("soft-deletes an error", async () => {
    await request(app).post("/errors/ingest").set(ingestHeaders()).send(validPayload);
    const list = await request(app).get("/errors").set(auth());
    const id = list.body[0].id as string;

    const del = await request(app).delete(`/errors/${id}`).set(auth());
    expect(del.status).toBe(204);

    const check = await request(app).get(`/errors/${id}`).set(auth());
    expect(check.status).toBe(404);
  });
});

import request from "supertest";
import { setup, teardown, cleanDb, app } from "./helpers";

beforeAll(async () => { await setup(); });
afterEach(async () => { await cleanDb(); });
afterAll(async () => { await teardown(); });

const validUser = {
  name: "Ana García",
  email: "ana@example.com",
  password: "secret123",
  initials: "AG",
  color: "#3b82f6",
};

describe("POST /auth/register", () => {
  it("creates a user and returns token", async () => {
    const res = await request(app).post("/auth/register").send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("ana@example.com");
    expect(res.body.user.password).toBeUndefined();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/auth/register").send({ email: "x@x.com", password: "p" });
    expect(res.status).toBe(400);
  });

  it("returns 409 when email is already taken", async () => {
    await request(app).post("/auth/register").send(validUser);
    const res = await request(app).post("/auth/register").send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("EMAIL_TAKEN");
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/auth/register").send(validUser);
  });

  it("returns token on valid credentials", async () => {
    const res = await request(app).post("/auth/login").send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("returns 401 on wrong password", async () => {
    const res = await request(app).post("/auth/login").send({ email: validUser.email, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 401 on unknown email", async () => {
    const res = await request(app).post("/auth/login").send({ email: "nobody@x.com", password: "p" });
    expect(res.status).toBe(401);
  });
});

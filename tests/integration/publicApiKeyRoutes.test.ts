import request from "supertest";
import { createHash } from "crypto";
import { setup, teardown, cleanDb, app, prisma } from "./helpers";

beforeAll(async () => { await setup(); });
afterEach(async () => { await cleanDb(); });
afterAll(async () => { await teardown(); });

let token: string;
let apiKey: string;
let apiKeyId: string;

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
    .send({ name: "Public Key" });

  apiKey = keyRes.body.key as string;
  apiKeyId = keyRes.body.id as string;
});

const publicRoutes: Array<{
  method: "get" | "post";
  path: string;
  send?: Record<string, unknown>;
}> = [
  { method: "post", path: "/errors/ingest", send: { type: "TypeError", message: "boom" } },
  { method: "post", path: "/mail/send", send: { config: "smtp", to: "to@example.com", subject: "Hi", html: "<p>Hi</p>" } },
  { method: "post", path: "/mp/pay", send: { items: [{ title: "Item", quantity: 1, unit_price: 100 }] } },
  { method: "get", path: "/mp/payment/123" },
  { method: "post", path: "/arca/wsfe/voucher", send: {} },
  { method: "post", path: "/arca/wsfe/voucher/pdf", send: {} },
  { method: "get", path: "/arca/wsfe/sales-points?cuit=30715678901" },
  { method: "get", path: "/arca/padron/30715678901" },
  { method: "post", path: "/whatsapp/send", send: { to: "5491112345678", body: "Hola" } },
];

describe("public API key routes", () => {
  it.each(publicRoutes)("$method $path requires x-api-key, not bearer auth", async ({ method, path, send }) => {
    const req = request(app)[method](path).set({ Authorization: "Bearer fake" });
    const res = send === undefined ? await req : await req.send(send);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "INVALID_API_KEY" });
    expect(res.body.message).not.toBe("MISSING_TOKEN");
  });

  it("GET /arca/wsfe/sales-points accepts x-api-key before validating ARCA config", async () => {
    const res = await request(app)
      .get("/arca/wsfe/sales-points?cuit=30715678901")
      .set({ "x-api-key": apiKey });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "ARCA_NOT_CONFIGURED" });
  });

  it("GET /arca/wsfe/sales-points validates request data after x-api-key auth", async () => {
    const res = await request(app)
      .get("/arca/wsfe/sales-points")
      .set({ "x-api-key": apiKey });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "CUIT_REQUIRED" });
  });
});

describe("POST /mail/send API key scoping", () => {
  it("does not allow a valid API key to use an unassigned mail config", async () => {
    await prisma.mailConfig.create({
      data: {
        name: "smtp",
        host: "smtp.example.com",
        port: 587,
        user: "user@example.com",
        pass: "secret",
        from: "from@example.com",
        apiKeyId: null,
      },
    });

    const res = await request(app)
      .post("/mail/send")
      .set({ "x-api-key": apiKey })
      .send({ config: "smtp", to: "to@example.com", subject: "Hi", html: "<p>Hi</p>" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "CONFIG_NOT_FOUND" });
  });

  it("does not allow API key A to use a mail config assigned to API key B", async () => {
    const otherRawKey = "aks_other_public_key_for_mail_scope";
    const other = await prisma.apiKey.create({
      data: {
        name: "Other Key",
        keyHash: createHash("sha256").update(otherRawKey).digest("hex"),
        prefix: otherRawKey.slice(0, 8),
      },
    });

    await prisma.mailConfig.create({
      data: {
        name: "smtp",
        host: "smtp.example.com",
        port: 587,
        user: "user@example.com",
        pass: "secret",
        from: "from@example.com",
        apiKeyId: other.id,
      },
    });

    const res = await request(app)
      .post("/mail/send")
      .set({ "x-api-key": apiKey })
      .send({ config: "smtp", to: "to@example.com", subject: "Hi", html: "<p>Hi</p>" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "CONFIG_NOT_FOUND" });
  });

  it("uses the mail config assigned to the request API key", async () => {
    await prisma.mailConfig.create({
      data: {
        name: "smtp",
        host: "smtp.invalid",
        port: 587,
        user: "user@example.com",
        pass: "secret",
        from: "from@example.com",
        apiKeyId,
      },
    });

    const res = await request(app)
      .post("/mail/send")
      .set({ "x-api-key": apiKey })
      .send({ config: "smtp", to: "to@example.com", subject: "Hi", html: "<p>Hi</p>" });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: "MAIL_SEND_FAILED" });
  });
});

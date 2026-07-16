import { buildHealthResponse } from "../../src/infrastructure/http/express/health";

describe("buildHealthResponse", () => {
  it("exposes build version and public route auth mode", () => {
    const health = buildHealthResponse("commit-sha");

    expect(health.ok).toBe(true);
    expect(health.version).toBe("commit-sha");
    expect(health.routes["GET /arca/wsfe/sales-points"]).toBe("x-api-key");
  });
});

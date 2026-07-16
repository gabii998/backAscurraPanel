export interface HealthResponse {
  ok: true;
  version: string;
  routes: Record<string, string>;
}

export function buildHealthResponse(version: string): HealthResponse {
  return {
    ok: true,
    version,
    routes: {
      "GET /arca/wsfe/sales-points": "x-api-key",
    },
  };
}

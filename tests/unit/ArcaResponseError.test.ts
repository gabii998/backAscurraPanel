import { assertArcaResponseOk, extractArcaResponseErrors, formatArcaResponseError } from "../../src/application/services/ArcaResponseError";

describe("ArcaResponseError", () => {
  it("normalizes AFIP errors embedded in a successful response body", () => {
    const response = {
      resultGet: { ptoVenta: [] },
      errors: {
        err: [
          { code: 600, msg: "ValidacionDeToken: No aparecio CUIT en lista de relaciones: 20000000000" },
        ],
      },
    };

    expect(extractArcaResponseErrors(response)).toEqual([
      {
        code: 600,
        message: "ValidacionDeToken: No aparecio CUIT en lista de relaciones: 20000000000",
      },
    ]);
    expect(() => assertArcaResponseOk(response)).toThrow("ARCA_RESPONSE_ERROR");
  });

  it("accepts responses without AFIP errors", () => {
    expect(() => assertArcaResponseOk({ resultGet: { ptoVenta: [{ nro: 1 }] } })).not.toThrow();
  });

  it("formats normalized AFIP errors for logs", () => {
    expect(formatArcaResponseError([{ code: 600, message: "No autorizado" }])).toBe("600: No autorizado");
  });
});

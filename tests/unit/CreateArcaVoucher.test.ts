import { CreateArcaVoucher } from "../../src/application/use-cases/CreateArcaVoucher";
import type { ArcaConfigRepository } from "../../src/domain/repositories/ArcaConfigRepository";
import type { ArcaLogRepository } from "../../src/domain/repositories/ArcaLogRepository";
import type { ArcaConfig } from "../../src/domain/entities/ArcaConfig";
import type { ArcaLog } from "../../src/domain/entities/ArcaLog";

jest.mock("../../src/infrastructure/services/ArcaService", () => ({
  ArcaService: jest.fn().mockImplementation(() => ({
    billing: { createNextVoucher: jest.fn().mockResolvedValue({ CAE: "12345678901234" }) },
  })),
}));

const baseConfig: ArcaConfig = {
  id: "cfg-1",
  name: "test",
  cuit: "20123456789",
  cert: "CERT",
  privateKey: "KEY",
  production: false,
  certExpiresAt: null,
  certExpiryNotifiedAt: null,
  updatedAt: new Date(),
  createdAt: new Date(),
};

const existingLog: ArcaLog = {
  id: "log-1",
  configId: "cfg-1",
  emisorCuit: "30712345678",
  service: "wsfe",
  method: "createNextVoucher",
  request: "{}",
  response: JSON.stringify({ CAE: "12345678901234" }),
  status: "ok",
  error: "",
  durationMs: 120,
  idempotencyKey: "existing-guid",
  updatedAt: new Date(),
  createdAt: new Date(),
};

const validVoucher = {
  CantReg: 1, PtoVta: 1, CbteTipo: 1, Concepto: 1,
  DocTipo: 80, DocNro: 20123456789, CbteDesde: 1, CbteHasta: 1,
  CbteFch: "20260714", ImpTotal: 121, ImpTotConc: 0, ImpNeto: 100,
  ImpOpEx: 0, ImpIVA: 21, ImpTrib: 0, MonId: "PES", MonCotiz: 1,
  CondicionIVAReceptorId: 1,
  Iva: [{ Id: 5, BaseImp: 100, Importe: 21 }],
};

const makeConfigRepo = (overrides: Partial<ArcaConfigRepository> = {}): ArcaConfigRepository => ({
  list:                        jest.fn(),
  listWithApiKeys:             jest.fn(),
  getById:                     jest.fn(),
  getByApiKeyId:               jest.fn().mockResolvedValue(baseConfig),
  create:                      jest.fn(),
  update:                      jest.fn(),
  delete:                      jest.fn(),
  assignApiKey:                jest.fn(),
  unassignApiKey:              jest.fn(),
  updateCertExpiryNotifiedAt:  jest.fn(),
  ...overrides,
});

const makeLogRepo = (overrides: Partial<ArcaLogRepository> = {}): ArcaLogRepository => ({
  create:                  jest.fn().mockResolvedValue({ id: "log-1" }),
  list:                    jest.fn(),
  count:                   jest.fn(),
  findByIdempotencyKey:    jest.fn().mockResolvedValue(null),
  update:                  jest.fn().mockResolvedValue({}),
  ...overrides,
});

describe("CreateArcaVoucher", () => {
  const EMISOR_CUIT = "30712345678";

  it("uses the requested emitter CUIT instead of the central config CUIT", async () => {
    const { ArcaService } = require("../../src/infrastructure/services/ArcaService");
    const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());

    await uc.execute("key-1", validVoucher, "emisor-guid", EMISOR_CUIT);

    expect(ArcaService).toHaveBeenCalledWith(expect.objectContaining({
      cuit: EMISOR_CUIT,
      configId: "cfg-1",
    }));
  });

  describe("idempotency", () => {
    it("returns cached response without calling ARCA when key already exists", async () => {
      const { ArcaService } = require("../../src/infrastructure/services/ArcaService");
      const arcaMock = jest.fn();
      (ArcaService as jest.Mock).mockImplementationOnce(() => ({
        billing: { createNextVoucher: arcaMock },
      }));
      const logRepo = makeLogRepo({ findByIdempotencyKey: jest.fn().mockResolvedValue(existingLog) });
      const uc = new CreateArcaVoucher(makeConfigRepo(), logRepo);
      const result = await uc.execute("key-1", validVoucher, "existing-guid", EMISOR_CUIT);
      expect(result.replayed).toBe(true);
      expect(result.response).toEqual({ CAE: "12345678901234" });
      expect(arcaMock).not.toHaveBeenCalled();
      // El mock one-shot no se consume en un replay: restaurar el comportamiento
      // predeterminado para la siguiente prueba que sí crea el servicio.
      (ArcaService as jest.Mock).mockReset().mockImplementation(() => ({
        billing: { createNextVoucher: jest.fn().mockResolvedValue({ CAE: "12345678901234" }) },
      }));
    });

    it("does not create a new log on replay", async () => {
      const logRepo = makeLogRepo({ findByIdempotencyKey: jest.fn().mockResolvedValue(existingLog) });
      await new CreateArcaVoucher(makeConfigRepo(), logRepo).execute("key-1", validVoucher, "existing-guid", EMISOR_CUIT);
      expect(logRepo.create).not.toHaveBeenCalled();
    });

    it("returns replayed: false on first successful call", async () => {
      const result = await new CreateArcaVoucher(makeConfigRepo(), makeLogRepo()).execute("key-1", validVoucher, "new-guid", EMISOR_CUIT);
      expect(result.replayed).toBe(false);
    });

    it("persists idempotencyKey when creating the log, then marks it ok on success", async () => {
      const logRepo = makeLogRepo();
      await new CreateArcaVoucher(makeConfigRepo(), logRepo).execute("key-1", validVoucher, "my-guid", EMISOR_CUIT);
      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: "my-guid", status: "PENDING" })
      );
      expect(logRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "ok" })
      );
    });

    it("keeps the log in PENDING status on an ambiguous SDK failure, so a blind retry is blocked", async () => {
      const { ArcaService } = require("../../src/infrastructure/services/ArcaService");
      (ArcaService as jest.Mock).mockImplementationOnce(() => ({
        billing: { createNextVoucher: jest.fn().mockRejectedValue(new Error("WSFE timeout")) },
      }));
      const logRepo = makeLogRepo();
      await expect(
        new CreateArcaVoucher(makeConfigRepo(), logRepo).execute("key-1", validVoucher, "fail-guid", EMISOR_CUIT)
      ).rejects.toThrow("ARCA_VOUCHER_FAILED");
      expect(logRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "PENDING", error: "WSFE timeout" })
      );
    });

    it("throws ARCA_VOUCHER_PENDING_RECONCILIATION when retrying a key stuck in PENDING", async () => {
      const pendingLog: ArcaLog = { ...existingLog, status: "PENDING", response: JSON.stringify({ pending: true }) };
      const logRepo = makeLogRepo({ findByIdempotencyKey: jest.fn().mockResolvedValue(pendingLog) });
      const uc = new CreateArcaVoucher(makeConfigRepo(), logRepo);
      await expect(uc.execute("key-1", validVoucher, "existing-guid", EMISOR_CUIT))
        .rejects.toThrow("ARCA_VOUCHER_PENDING_RECONCILIATION");
    });

    it("throws ARCA_VOUCHER_ALREADY_REJECTED when retrying a key already rejected by ARCA", async () => {
      const rejectedLog: ArcaLog = { ...existingLog, status: "REJECTED", response: JSON.stringify({ error: "rejected" }) };
      const logRepo = makeLogRepo({ findByIdempotencyKey: jest.fn().mockResolvedValue(rejectedLog) });
      const uc = new CreateArcaVoucher(makeConfigRepo(), logRepo);
      await expect(uc.execute("key-1", validVoucher, "existing-guid", EMISOR_CUIT))
        .rejects.toThrow("ARCA_VOUCHER_ALREADY_REJECTED");
    });
  });

  describe("config lookup", () => {
    it("throws ARCA_NOT_CONFIGURED when no config found for apiKeyId", async () => {
      const uc = new CreateArcaVoucher(
        makeConfigRepo({ getByApiKeyId: jest.fn().mockResolvedValue(null) }),
        makeLogRepo(),
      );
      await expect(uc.execute("key-1", validVoucher, "guid-1", EMISOR_CUIT)).rejects.toThrow("ARCA_NOT_CONFIGURED");
    });
  });

  describe("validation", () => {
    it("throws VOUCHER_MISSING_FIELDS when a required field is absent", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      const { CbteFch: _omit, ...incomplete } = validVoucher;
      await expect(uc.execute("key-1", incomplete, "guid-1", EMISOR_CUIT)).rejects.toThrow("VOUCHER_MISSING_FIELDS");
    });

    it("throws VOUCHER_INVALID_DATE for non-8-digit CbteFch", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      await expect(uc.execute("key-1", { ...validVoucher, CbteFch: "2026-07-14" }, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_INVALID_DATE");
    });

    it("throws VOUCHER_INVALID_DATE for impossible calendar date", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      await expect(uc.execute("key-1", { ...validVoucher, CbteFch: "20260231" }, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_INVALID_DATE");
    });

    it("throws VOUCHER_MISSING_FIELDS when Concepto=2 and FchServDesde is absent", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      await expect(uc.execute("key-1", { ...validVoucher, Concepto: 2 }, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_MISSING_FIELDS");
    });

    it("throws VOUCHER_MISSING_FIELDS when Concepto=3 and FchServHasta is absent", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      await expect(uc.execute("key-1", { ...validVoucher, Concepto: 3, FchServDesde: "20260701" }, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_MISSING_FIELDS");
    });

    it("throws VOUCHER_MISSING_IVA when ImpIVA > 0 but Iva is absent", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      const { Iva: _omit, ...noIva } = validVoucher;
      await expect(uc.execute("key-1", { ...noIva, ImpIVA: 21 }, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_MISSING_IVA");
    });

    it("throws VOUCHER_MISSING_IVA when ImpIVA > 0 and Iva is empty array", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      await expect(uc.execute("key-1", { ...validVoucher, Iva: [] }, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_MISSING_IVA");
    });

    it("does not throw VOUCHER_MISSING_IVA when ImpIVA is 0", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      const { Iva: _omit, ...noIva } = validVoucher;
      await expect(uc.execute("key-1", { ...noIva, ImpIVA: 0 }, "guid-1", EMISOR_CUIT)).resolves.toBeDefined();
    });

    it("throws VOUCHER_MISSING_COMPROBANTES_ASOC for nota de credito (CbteTipo=3)", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      await expect(uc.execute("key-1", { ...validVoucher, CbteTipo: 3, ImpIVA: 0, Iva: [] }, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_MISSING_COMPROBANTES_ASOC");
    });

    it("throws VOUCHER_MISSING_COMPROBANTES_ASOC for nota de debito (CbteTipo=7)", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      await expect(uc.execute("key-1", { ...validVoucher, CbteTipo: 7, ImpIVA: 0, Iva: [] }, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_MISSING_COMPROBANTES_ASOC");
    });

    it("throws VOUCHER_MISSING_COMPROBANTES_ASOC when a CbtesAsoc item is missing Cuit (nota de credito)", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      const voucher = {
        ...validVoucher, CbteTipo: 3, ImpIVA: 0, Iva: [],
        CbtesAsoc: [{ Tipo: 1, PtoVta: 1, Nro: 42 }],
      };
      await expect(uc.execute("key-1", voucher, "guid-1", EMISOR_CUIT))
        .rejects.toThrow("VOUCHER_MISSING_COMPROBANTES_ASOC");
    });

    it("does not throw when CbtesAsoc has all required fields (nota de credito)", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      const voucher = {
        ...validVoucher, CbteTipo: 3, ImpIVA: 0, Iva: [],
        CbtesAsoc: [{ Tipo: 1, PtoVta: 1, Nro: 42, Cuit: "20123456789" }],
      };
      await expect(uc.execute("key-1", voucher, "guid-1", EMISOR_CUIT)).resolves.toBeDefined();
    });
  });

  describe("ARCA call and logging", () => {
    it("returns ARCA response on success", async () => {
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      const result = await uc.execute("key-1", validVoucher, "guid-1", EMISOR_CUIT);
      expect(result.response).toEqual({ CAE: "12345678901234" });
    });

    it("writes log with status ok on success", async () => {
      const logRepo = makeLogRepo();
      await new CreateArcaVoucher(makeConfigRepo(), logRepo).execute("key-1", validVoucher, "guid-1", EMISOR_CUIT);
      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "PENDING", method: "createNextVoucher" })
      );
      expect(logRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "ok" })
      );
    });

    it("throws ARCA_VOUCHER_FAILED when ARCA call fails", async () => {
      const { ArcaService } = require("../../src/infrastructure/services/ArcaService");
      (ArcaService as jest.Mock).mockImplementationOnce(() => ({
        billing: { createNextVoucher: jest.fn().mockRejectedValue(new Error("WSFE timeout")) },
      }));
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      await expect(uc.execute("key-1", validVoucher, "guid-1", EMISOR_CUIT)).rejects.toThrow("ARCA_VOUCHER_FAILED");
    });

    it("exposes ARCA error message in err.detail", async () => {
      const { ArcaService } = require("../../src/infrastructure/services/ArcaService");
      (ArcaService as jest.Mock).mockImplementationOnce(() => ({
        billing: { createNextVoucher: jest.fn().mockRejectedValue(new Error("WSFE timeout")) },
      }));
      const uc = new CreateArcaVoucher(makeConfigRepo(), makeLogRepo());
      const err = await uc.execute("key-1", validVoucher, "guid-1", EMISOR_CUIT).catch((e: unknown) => e);
      expect((err as Error & { detail: string }).detail).toBe("WSFE timeout");
    });

    it("propagates the error when the initial log write fails, before ever calling ARCA", async () => {
      const logRepo = makeLogRepo({ create: jest.fn().mockRejectedValue(new Error("DB down")) });
      const uc = new CreateArcaVoucher(makeConfigRepo(), logRepo);
      await expect(uc.execute("key-1", validVoucher, "guid-1", EMISOR_CUIT)).rejects.toThrow("DB down");
    });

    it("throws ARCA_RESPONSE_ERROR when AFIP returns errors inside the response body", async () => {
      const { ArcaService } = require("../../src/infrastructure/services/ArcaService");
      const afipResponse = { errors: { err: [{ code: 600, msg: "CUIT no autorizado" }] } };
      (ArcaService as jest.Mock).mockImplementationOnce(() => ({
        billing: { createNextVoucher: jest.fn().mockResolvedValue(afipResponse) },
      }));
      const logRepo = makeLogRepo();
      const uc = new CreateArcaVoucher(makeConfigRepo(), logRepo);

      await expect(uc.execute("key-1", validVoucher, "guid-1", EMISOR_CUIT))
        .rejects.toMatchObject({
          message: "ARCA_RESPONSE_ERROR",
          detail: [{ code: 600, message: "CUIT no autorizado" }],
        });

      expect(logRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: "PENDING",
        idempotencyKey: "guid-1",
      }));
      expect(logRepo.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        status: "REJECTED",
        response: JSON.stringify(afipResponse),
        error: "600: CUIT no autorizado",
      }));
    });
  });
});

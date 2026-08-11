import { readFileSync } from "fs";
import { join } from "path";
import { InvoicePdfGenerator, VOUCHER_TYPE_LETTER } from "@arcasdk/pdf";
import type {
  EmisorData,
  ReceptorData,
  InvoiceItem,
  IvaDetail,
  TributoDetail,
  ComprobanteAsociado,
  PdfGeneratorOptions,
} from "@arcasdk/pdf";
import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { ArcaLogRepository } from "../../domain/repositories/ArcaLogRepository";

const customTemplate = readFileSync(
  join(__dirname, "../../templates/invoice-document.hbs"),
  "utf-8"
);

const IVA_DESC: Record<number, string> = {
  3: "0%",
  4: "10,5%",
  5: "21%",
  6: "27%",
  8: "5%",
  9: "2,5%",
};

const DOC_TIPO_DESC: Record<number, string> = {
  80: "CUIT",
  86: "CUIL",
  87: "CDI",
  89: "LE",
  90: "LC",
  91: "CI Extranjera",
  96: "DNI",
  99: "Consumidor Final",
};

const CONDICION_IVA_DESC: Record<number, string> = {
  1:  "IVA Responsable Inscripto",
  4:  "IVA Sujeto Exento",
  5:  "Consumidor Final",
  6:  "Responsable Monotributo",
  7:  "Sujeto no Categorizado",
  8:  "Importador del Exterior",
  9:  "Cliente del Exterior",
  10: "IVA Liberado - Ley Nº 19.640",
  13: "Monotributista Social",
};

export interface GenerateVoucherPdfInput {
  apiKeyId: string;
  idempotencyKey: string;
  emisor: EmisorData;
  /** Solo los datos del receptor que no están en el request de AFIP */
  receptor?: {
    razonSocial?: string;
    domicilio?: string;
  };
  items: InvoiceItem[];
  options?: PdfGeneratorOptions;
}

export class GenerateVoucherPdf {
  constructor(
    private configRepo: ArcaConfigRepository,
    private logRepo: ArcaLogRepository,
  ) {}

  async execute(input: GenerateVoucherPdfInput): Promise<Buffer> {
    const config = await this.configRepo.getByApiKeyId(input.apiKeyId);
    if (!config) throw new Error("ARCA_NOT_CONFIGURED");

    const emisorCuit = String((input.emisor as unknown as Record<string, unknown>)["cuit"] ?? "").replace(/\D/g, "");
    const log = await this.logRepo.findByIdempotencyKey(config.id, emisorCuit, input.idempotencyKey);
    if (!log || log.configId !== config.id) throw new Error("VOUCHER_NOT_FOUND");
    if (log.status !== "OK") throw new Error("VOUCHER_FAILED");

    const req  = JSON.parse(log.request)  as Record<string, unknown>;
    const res  = JSON.parse(log.response) as Record<string, unknown>;

    const innerRes = res["response"] as Record<string, unknown> | undefined;
    const det = (
      (innerRes?.["FeDetResp"] as Record<string, unknown> | undefined)
        ?.["FECAEDetResponse"] as Record<string, unknown>[] | undefined
    )?.[0] ?? {};

    const cae           = String(res["cae"] ?? "");
    const caeFchVto     = String(res["caeFchVto"] ?? "");
    const cbteDesde     = Number(det["CbteDesde"] ?? req["CbteDesde"] ?? 0);
    const cbteHasta     = Number(det["CbteHasta"] ?? req["CbteHasta"] ?? cbteDesde);
    const cbteTipo      = Number(req["CbteTipo"] ?? 0);
    const cbteLetra     = (VOUCHER_TYPE_LETTER as Record<number, string>)[cbteTipo] ?? "";

    const rawIva = req["Iva"] as Array<Record<string, unknown>> | undefined;
    const iva: IvaDetail[] | undefined = rawIva?.map((i) => ({
      id:            Number(i["Id"]),
      descripcion:   IVA_DESC[Number(i["Id"])] ?? String(i["Id"]),
      baseImponible: Number(i["BaseImp"]),
      importe:       Number(i["Importe"]),
    }));

    const rawTrib = req["Tributos"] as Array<Record<string, unknown>> | undefined;
    const tributos: TributoDetail[] | undefined = rawTrib?.map((t) => ({
      id:            Number(t["Id"]),
      descripcion:   String(t["Desc"] ?? ""),
      baseImponible: Number(t["BaseImp"]),
      alicuota:      Number(t["Alic"]),
      importe:       Number(t["Importe"]),
    }));

    const rawAsoc = req["CbtesAsoc"] as Array<Record<string, unknown>> | undefined;
    const cbtesAsociados: ComprobanteAsociado[] | undefined = rawAsoc?.map((a) => ({
      tipo:        Number(a["Tipo"]),
      puntoVenta:  Number(a["PtoVta"]),
      numero:      Number(a["Nro"]),
      cuit:        a["Cuit"] !== undefined ? String(a["Cuit"]) : undefined,
      fecha:       a["CbteFch"] !== undefined ? String(a["CbteFch"]) : undefined,
    }));

    const docTipo      = Number(req["DocTipo"] ?? 99);
    const condicionId  = docTipo === 99 ? 5 : Number(req["CondicionIVAReceptorId"] ?? 5);
    const receptor: ReceptorData = {
      razonSocial:   docTipo === 99 ? "" : (input.receptor?.razonSocial ?? ""),
      domicilio:     input.receptor?.domicilio,
      condicionIva:  CONDICION_IVA_DESC[condicionId] ?? String(condicionId),
      documentoTipo: docTipo === 99 ? "" : (DOC_TIPO_DESC[docTipo] ?? String(docTipo)),
      documentoNro:  docTipo === 99 ? "" : String(req["DocNro"] ?? ""),
    };

    const generatorOptions = { ...(input.options ?? {}), template: customTemplate };
    const generator = new InvoicePdfGenerator(generatorOptions);
    return generator.generate({
      emisor:              input.emisor,
      receptor,
      cbteTipo,
      cbteLetra,
      puntoVenta:          Number(req["PtoVta"] ?? 0),
      cbteDesde,
      cbteHasta,
      cbteFecha:           String(req["CbteFch"] ?? ""),
      concepto:            Number(req["Concepto"] ?? 1),
      moneda:              String(req["MonId"] ?? "PES"),
      cotizacion:          Number(req["MonCotiz"] ?? 1),
      fechaServicioDesde:  req["FchServDesde"] !== undefined ? String(req["FchServDesde"]) : undefined,
      fechaServicioHasta:  req["FchServHasta"] !== undefined ? String(req["FchServHasta"]) : undefined,
      fechaVtoPago:        req["FchVtoPago"]   !== undefined ? String(req["FchVtoPago"])   : undefined,
      items:               input.items,
      importeNetoGravado:  Number(req["ImpNeto"]     ?? 0),
      importeNetoNoGravado:Number(req["ImpTotConc"]  ?? 0),
      importeExento:       Number(req["ImpOpEx"]     ?? 0),
      importeIva:          Number(req["ImpIVA"]      ?? 0),
      importeTributos:     Number(req["ImpTrib"]     ?? 0),
      importeTotal:        Number(req["ImpTotal"]    ?? 0),
      iva,
      tributos,
      cbtesAsociados,
      cae,
      caeFechaVencimiento: caeFchVto,
    });
  }
}

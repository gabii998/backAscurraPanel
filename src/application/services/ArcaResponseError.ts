export interface ArcaResponseErrorDetail {
  code: string | number;
  message: string;
}

export class ArcaResponseError extends Error {
  constructor(public readonly detail: ArcaResponseErrorDetail[]) {
    super("ARCA_RESPONSE_ERROR");
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toErrorDetail = (value: unknown): ArcaResponseErrorDetail | null => {
  if (!isRecord(value)) return null;

  const message = value["msg"] ?? value["message"] ?? value["Msg"] ?? value["Message"];
  if (message === undefined || message === null || String(message).trim() === "") return null;

  const code = value["code"] ?? value["Code"] ?? value["codigo"] ?? value["Codigo"] ?? "ARCA_ERROR";
  return { code: typeof code === "number" ? code : String(code), message: String(message) };
};

const collectErrorDetails = (value: unknown): ArcaResponseErrorDetail[] => {
  if (Array.isArray(value)) return value.map(toErrorDetail).filter((e): e is ArcaResponseErrorDetail => e !== null);

  const single = toErrorDetail(value);
  return single ? [single] : [];
};

export function extractArcaResponseErrors(response: unknown): ArcaResponseErrorDetail[] {
  if (!isRecord(response)) return [];

  const containers = [
    response["errors"],
    response["Errors"],
    response["errores"],
    response["Errores"],
  ].filter((value): value is unknown => value !== undefined && value !== null);

  const details: ArcaResponseErrorDetail[] = [];

  for (const container of containers) {
    if (isRecord(container)) {
      details.push(
        ...collectErrorDetails(container["err"]),
        ...collectErrorDetails(container["Err"]),
        ...collectErrorDetails(container["error"]),
        ...collectErrorDetails(container["Error"]),
      );
      continue;
    }

    details.push(...collectErrorDetails(container));
  }

  return details;
}

export function assertArcaResponseOk(response: unknown): void {
  const detail = extractArcaResponseErrors(response);
  if (detail.length > 0) throw new ArcaResponseError(detail);
}

export function formatArcaResponseError(detail: ArcaResponseErrorDetail[]): string {
  return detail.map((err) => `${err.code}: ${err.message}`).join("; ");
}

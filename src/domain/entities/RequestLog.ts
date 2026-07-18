export interface RequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  requestBody: string | null;
  responseBody: string | null;
  errorMessage: string | null;
  createdAt: Date;
}

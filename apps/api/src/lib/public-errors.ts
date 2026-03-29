export class PublicContentError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "PublicContentError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

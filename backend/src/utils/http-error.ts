export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Nao autenticado') {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Acesso negado') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Recurso nao encontrado') {
    return new HttpError(404, message);
  }

  static conflict(message: string, details?: unknown) {
    return new HttpError(409, message, details);
  }
}

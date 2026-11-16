export class ApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string,
    public providerError: unknown = null,
  ) {
    super(message);
  }
}

export const badRequest = (m: string) => new ApiError(400, 'invalid_request_error', m);
export const unauthorized = (m = 'missing or invalid API key') => new ApiError(401, 'unauthorized', m);
export const notFound = (what: string) => new ApiError(404, 'not_found_error', `${what} not found`);
export const conflict = (m: string) => new ApiError(409, 'conflict', m);
export const providerRejected = (m: string) => new ApiError(422, 'provider_rejected', m);

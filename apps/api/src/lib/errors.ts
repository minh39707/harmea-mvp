import type { Response } from 'express';
export class InputError extends Error {
  constructor(message: string, publicCode = 'VALIDATION_ERROR', statusCode = 422) {
    super(message);
    this.code = publicCode;
    this.status = statusCode;
  }
  code: string;
  status: number;
}

export function sendInputError(res: Response, error: InputError) {
  res.status(error.status).json({ error: { code: error.code, message: error.message } });
}

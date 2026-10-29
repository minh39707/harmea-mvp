import type { RequestHandler } from 'express';
export const securityHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

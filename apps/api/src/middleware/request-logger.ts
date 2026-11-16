import { performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = performance.now();
  const path = request.path;
  let logged = false;
  const log = () => {
    if (logged) return;
    logged = true;
    process.stdout.write(
      `${JSON.stringify({
        method: request.method,
        path,
        status: response.statusCode,
        duration_ms: Math.max(0, Math.round(performance.now() - startedAt))
      })}\n`
    );
  };
  response.once('finish', log);
  response.once('close', log);
  next();
};

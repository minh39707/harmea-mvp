import type { Application } from 'express';

export function trustSingleReverseProxy(app: Application) {
  app.set('trust proxy', 1);
}

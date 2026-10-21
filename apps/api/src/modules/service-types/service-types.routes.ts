import { Router } from 'express';
import type { ServiceTypesController } from './service-types.controller.ts';

export function serviceTypesRouter(controller: ServiceTypesController): Router {
  return Router().get('/service-types', controller.list);
}

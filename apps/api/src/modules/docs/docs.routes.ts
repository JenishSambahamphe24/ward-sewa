import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenApiHelper } from './openapi.helper.ts';

export function docsRouter(): Router {
  const document = OpenApiHelper.document();
  return Router()
    .get('/openapi.json', (_req, res) => {
      res.json(document);
    })
    .use(
      '/docs',
      swaggerUi.serve,
      // Relative, so the page works at /docs and behind nginx at /api/docs.
      swaggerUi.setup(undefined, {
        customSiteTitle: 'Ward Sewa API',
        swaggerOptions: { url: '../openapi.json', persistAuthorization: true },
      }),
    );
}

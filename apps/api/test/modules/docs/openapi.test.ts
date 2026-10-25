import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.ts';
import { OpenApiHelper } from '../../../src/modules/docs/openapi.helper.ts';
import { UnitDeps } from '../../support/unit-deps.ts';

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  handle: { stack?: Layer[] };
}

// Walks Express's own route table, so a new endpoint can't ship undocumented.
function registeredRoutes(app: Express): string[] {
  const walk = (stack: Layer[]): string[] =>
    stack.flatMap((layer) => {
      if (layer.route) {
        const path = layer.route.path.replace(/:(\w+)/g, '{$1}');
        return Object.keys(layer.route.methods).map((method) => `${method} ${path}`);
      }
      return layer.handle.stack ? walk(layer.handle.stack) : [];
    });
  const router = (app as unknown as { router: { stack: Layer[] } }).router;
  return walk(router.stack).filter((route) => route !== 'get /openapi.json');
}

const app = createApp(UnitDeps.create());

describe('OpenAPI document', () => {
  it('documents exactly the routes the API serves', () => {
    const documented = OpenApiHelper.operations.map((op) => `${op.method} ${op.path}`);
    expect(documented.sort()).toEqual(registeredRoutes(app).sort());
  });

  it('is served as OpenAPI 3.1 with every $ref resolvable', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    const refs = JSON.stringify(res.body).match(/#\/components\/schemas\/\w+/g) ?? [];
    for (const ref of new Set(refs)) {
      const component = res.body.components.schemas[ref.split('/').at(-1) as string];
      expect(component, ref).toBeDefined();
      expect(component.$ref, `${ref} points at itself`).toBeUndefined();
    }
  });

  it('builds request schemas from the same zod schemas that validate requests', async () => {
    const res = await request(app).get('/openapi.json');
    const body =
      res.body.paths['/staff/applications/{id}/transition'].post.requestBody.content[
        'application/json'
      ].schema;
    expect(body.required).toEqual(['to', 'version']);
    expect(body.properties.to.enum).toEqual(['under_review', 'needs_info', 'rejected', 'approved']);
  });

  it('serves the interactive page at /docs/', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});

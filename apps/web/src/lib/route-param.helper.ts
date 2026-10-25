import { notFound } from '@tanstack/react-router';

export class RouteParamHelper {
  // "/applications/abc" is a page that doesn't exist, not a request worth sending.
  static id(raw: string): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) throw notFound();
    return id;
  }
}

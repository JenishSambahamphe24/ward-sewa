import type { Role } from './session.ts';
import { ROLE_HOME } from './session.ts';

export class RedirectHelper {
  // Only same-site paths: "//evil.example" or "https://…" would turn login into an open redirect.
  static afterLogin(role: Role, requested: string | undefined): string {
    if (requested?.startsWith('/') && !requested.startsWith('//')) return requested;
    return ROLE_HOME[role];
  }
}

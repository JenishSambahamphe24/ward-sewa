import type { User } from './users.repository.ts';

export class UserView {
  static from({ id, phone, name, role, wardId, localLevelCode }: User) {
    return { id, phone, name, role, wardId, localLevelCode };
  }
}

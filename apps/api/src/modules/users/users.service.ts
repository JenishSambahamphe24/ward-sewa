import { DivisionHelper } from '@ward-sewa/nepal-utils';
import { AppError } from '../../lib/app-error.ts';
import type { User, UsersRepository } from './users.repository.ts';
import { createMunicipalityAdminSchema } from './users.schema.ts';
import type { CreateMunicipalityAdminInput } from './users.schema.ts';

export class UsersService {
  readonly #users: UsersRepository;

  constructor(users: UsersRepository) {
    this.#users = users;
  }

  async createMunicipalityAdmin(input: CreateMunicipalityAdminInput): Promise<User> {
    const { phone, localLevelCode, name } = createMunicipalityAdminSchema.parse(input);

    if (!DivisionHelper.getLocalLevel(localLevelCode)) {
      throw new AppError(404, 'NOT_FOUND', `No local level with code ${localLevelCode}`);
    }
    if (await this.#users.findByPhone(phone)) {
      throw new AppError(409, 'CONFLICT', 'This phone number is already registered');
    }

    return this.#users.create({ phone, name, role: 'municipality_admin', localLevelCode });
  }
}

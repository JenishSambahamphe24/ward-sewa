import type { TransactionRunner } from '../../db/transactions.ts';
import { AppError } from '../../lib/app-error.ts';
import { AuditOutboxRepository } from '../audit/audit-outbox.repository.ts';
import type { WardsRepository } from '../divisions/wards.repository.ts';
import type { User, UsersRepository } from '../users/users.repository.ts';
import type { StaffMember, StaffRepository } from './staff.repository.ts';
import {
  assignStaffSchema,
  listStaffQuerySchema,
  staffIdSchema,
  updateStaffSchema,
} from './staff.schema.ts';

export interface StaffServiceDeps {
  staff: StaffRepository;
  users: UsersRepository;
  wards: WardsRepository;
  transactions: TransactionRunner;
}

// `reason` lets clients show their own message without parsing the English text.
const chairTaken = (wardNo: number) =>
  new AppError(409, 'CONFLICT', `Ward ${wardNo} already has an active chair`, {
    details: { reason: 'ward_has_chair' },
  });

export class StaffService {
  readonly #deps: StaffServiceDeps;

  constructor(deps: StaffServiceDeps) {
    this.#deps = deps;
  }

  list(admin: User, query: unknown): Promise<StaffMember[]> {
    return this.#deps.staff.list(this.#scope(admin), listStaffQuerySchema.parse(query));
  }

  async assign(admin: User, input: unknown): Promise<StaffMember> {
    const { phone, name, role, wardNo } = assignStaffSchema.parse(input);
    const localLevelCode = this.#scope(admin);
    const wardId = await this.#wardId(localLevelCode, wardNo);
    if (role === 'ward_chair' && (await this.#deps.staff.hasActiveChair(wardId))) {
      throw chairTaken(wardNo);
    }

    const existing = await this.#deps.users.findByPhone(phone);
    if (existing && existing.role !== 'citizen') {
      throw new AppError(
        409,
        'CONFLICT',
        'This phone number already belongs to staff or an admin',
        {
          details: { reason: 'phone_is_staff' },
        },
      );
    }

    const userId = await this.#deps.transactions.run(async (tx) => {
      let id: number;
      if (existing) {
        await this.#deps.staff.update(existing.id, { name, role, wardId }, tx);
        id = existing.id;
      } else {
        id = (await this.#deps.users.create({ phone, name, role, wardId }, tx)).id;
      }
      await AuditOutboxRepository.add(tx, {
        type: 'staff.assigned',
        actor: { userId: admin.id, role: admin.role },
        target: { userId: id },
        changes: {
          role: { from: existing?.role ?? null, to: role },
          wardNo: { from: null, to: wardNo },
        },
      });
      return id;
    });
    return this.#mustFind(localLevelCode, userId);
  }

  async update(admin: User, id: unknown, input: unknown): Promise<StaffMember> {
    const changes = updateStaffSchema.parse(input);
    const localLevelCode = this.#scope(admin);
    const member = await this.#mustFind(localLevelCode, staffIdSchema.parse(id));

    const wardNo = changes.wardNo ?? member.ward.wardNo;
    const wardId =
      changes.wardNo === undefined ? member.ward.id : await this.#wardId(localLevelCode, wardNo);
    const role = changes.role ?? member.role;
    const isActive = changes.isActive ?? member.isActive;
    if (
      role === 'ward_chair' &&
      isActive &&
      (await this.#deps.staff.hasActiveChair(wardId, member.id))
    ) {
      throw chairTaken(wardNo);
    }

    await this.#deps.transactions.run(async (tx) => {
      await this.#deps.staff.update(member.id, { role, wardId, isActive }, tx);
      await AuditOutboxRepository.add(tx, {
        type: 'staff.updated',
        actor: { userId: admin.id, role: admin.role },
        target: { userId: member.id },
        changes: {
          role: { from: member.role, to: role },
          wardNo: { from: member.ward.wardNo, to: wardNo },
          isActive: { from: member.isActive, to: isActive },
        },
      });
    });
    return this.#mustFind(localLevelCode, member.id);
  }

  #scope(admin: User): string {
    if (admin.role !== 'municipality_admin' || !admin.localLevelCode) {
      throw new AppError(403, 'FORBIDDEN', 'Only a municipality admin can manage staff');
    }
    return admin.localLevelCode;
  }

  async #wardId(localLevelCode: string, wardNo: number): Promise<number> {
    const wardId = await this.#deps.wards.findId(localLevelCode, wardNo);
    if (wardId === null) {
      throw new AppError(400, 'VALIDATION_FAILED', `Ward ${wardNo} does not exist here`);
    }
    return wardId;
  }

  // 404, not 403, for other municipalities' staff: don't reveal that the id exists.
  async #mustFind(localLevelCode: string, id: number): Promise<StaffMember> {
    const member = await this.#deps.staff.find(localLevelCode, id);
    if (!member) throw new AppError(404, 'NOT_FOUND', 'No such staff member in your municipality');
    return member;
  }
}

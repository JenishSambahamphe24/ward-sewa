import { AppError } from '../../lib/app-error.ts';
import type { SmsGateway } from '../../lib/sms.ts';
import type { User, UsersRepository } from '../users/users.repository.ts';
import { requestOtpSchema, verifyOtpSchema } from './auth.schema.ts';
import { OTP_TTL_SECONDS } from './otp.store.ts';
import type { OtpStore } from './otp.store.ts';
import type { SessionStore } from './session.store.ts';

export interface AuthServiceDeps {
  otp: OtpStore;
  sessions: SessionStore;
  users: UsersRepository;
  sms: SmsGateway;
}

export class AuthService {
  readonly #deps: AuthServiceDeps;

  constructor(deps: AuthServiceDeps) {
    this.#deps = deps;
  }

  async requestOtp(input: unknown): Promise<{ expiresInSeconds: number }> {
    const { phone } = requestOtpSchema.parse(input);
    const code = await this.#deps.otp.issue(phone);
    await this.#deps.sms.send(phone, `Ward Sewa login code: ${code}. Valid for 5 minutes.`);
    return { expiresInSeconds: OTP_TTL_SECONDS };
  }

  async verifyOtp(input: unknown): Promise<{ token: string; user: User }> {
    const { phone, code } = verifyOtpSchema.parse(input);
    if (!(await this.#deps.otp.verify(phone, code))) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired code');
    }

    const user = await this.#deps.users.findOrCreateCitizen(phone);
    if (!user.isActive) throw new AppError(403, 'FORBIDDEN', 'This account is deactivated');

    return { token: await this.#deps.sessions.create(user.id), user };
  }

  // Role and active flag come from PostgreSQL on every call, so changes apply immediately.
  async authenticate(token: string): Promise<User | null> {
    const userId = await this.#deps.sessions.findUserId(token);
    if (userId === null) return null;
    const user = await this.#deps.users.findById(userId);
    return user?.isActive ? user : null;
  }

  async logout(token: string): Promise<void> {
    await this.#deps.sessions.destroy(token);
  }
}

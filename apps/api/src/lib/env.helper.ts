import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  MONGO_URL: z.url(),
  REDIS_URL: z.url(),
  AUTH_SECRET: z.string().min(32, 'Use at least 32 random characters'),
  SMS_GATEWAY: z.enum(['log']).default('log'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  // The web app's address: each letter's QR code links to <this>/verify/<code>.
  PUBLIC_BASE_URL: z.url().default('http://localhost:5173'),
  // Proxy hops in front of the API. 0 = trust no X-Forwarded-For (else clients could spoof IPs).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;

export class EnvHelper {
  static load(source: NodeJS.ProcessEnv = process.env): Env {
    return EnvHelper.parse(envSchema, source);
  }

  static loadDatabase(source: NodeJS.ProcessEnv = process.env): Pick<Env, 'DATABASE_URL'> {
    return EnvHelper.parse(envSchema.pick({ DATABASE_URL: true }), source);
  }

  static loadWorker(source: NodeJS.ProcessEnv = process.env) {
    return EnvHelper.parse(
      envSchema.pick({
        LOG_LEVEL: true,
        DATABASE_URL: true,
        MONGO_URL: true,
        REDIS_URL: true,
        UPLOAD_DIR: true,
        PUBLIC_BASE_URL: true,
      }),
      source,
    );
  }

  private static parse<T>(schema: z.ZodType<T>, source: NodeJS.ProcessEnv): T {
    const result = schema.safeParse(source);
    if (!result.success) {
      const problems = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
      throw new Error(`Invalid configuration:\n${problems.join('\n')}`);
    }
    return result.data;
  }
}

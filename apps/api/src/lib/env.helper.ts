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
});

export type Env = z.infer<typeof envSchema>;

export class EnvHelper {
  static load(source: NodeJS.ProcessEnv = process.env): Env {
    return EnvHelper.parse(envSchema, source);
  }

  static loadDatabase(source: NodeJS.ProcessEnv = process.env): Pick<Env, 'DATABASE_URL'> {
    return EnvHelper.parse(envSchema.pick({ DATABASE_URL: true }), source);
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

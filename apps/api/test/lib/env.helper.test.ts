import { describe, expect, it } from 'vitest';
import { EnvHelper } from '../../src/lib/env.helper.ts';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  MONGO_URL: 'mongodb://localhost:27017/db',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: 'x'.repeat(32),
};

describe('EnvHelper.load', () => {
  it('applies defaults and coerces types', () => {
    const env = EnvHelper.load({ ...valid, PORT: '8080' });
    expect(env.PORT).toBe(8080);
    expect(env.NODE_ENV).toBe('development');
  });

  it('lists every invalid variable in one error', () => {
    expect(() => EnvHelper.load({ PORT: 'abc' })).toThrow(
      /PORT[\s\S]*DATABASE_URL[\s\S]*MONGO_URL/,
    );
  });
});

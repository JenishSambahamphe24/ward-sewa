import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  MONGO_URL: 'mongodb://localhost:27017/db',
  REDIS_URL: 'redis://localhost:6379',
};

describe('loadConfig', () => {
  it('applies defaults and coerces types', () => {
    const config = loadConfig({ ...valid, PORT: '8080' });
    expect(config.PORT).toBe(8080);
    expect(config.NODE_ENV).toBe('development');
  });

  it('lists every invalid variable in one error', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT[\s\S]*DATABASE_URL[\s\S]*MONGO_URL/);
  });
});

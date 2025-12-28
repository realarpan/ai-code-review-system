import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const redisConnection = {
  host: new URL(redisUrl).hostname,
  port: parseInt(new URL(redisUrl).port || '6379'),
};

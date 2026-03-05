import IORedis from 'ioredis';

let redis;

export function getRedisConnection() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL is required for queue processing');
    }

    redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
  }

  return redis;
}

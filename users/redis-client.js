import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT || '6379'),
  enableOfflineQueue: false,
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err.message);
});

export default redisClient;

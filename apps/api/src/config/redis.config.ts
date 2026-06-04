import { registerAs } from "@nestjs/config";

export const redisConfigFactory = () => ({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});

export type RedisConfig = ReturnType<typeof redisConfigFactory>;

export default registerAs("redis", redisConfigFactory);

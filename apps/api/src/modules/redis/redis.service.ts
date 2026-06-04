import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

let redis: Redis | null = null;
const memoryStore = new Map<string, { value: string; expiresAt: number }>();
let useMemoryFallback = false;
const logger = new Logger("RedisService");

try {
  const redisUrl = process.env.REDIS_URL;
  let host = '172.16.192.63';
  let port = 6379;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      host = url.hostname;
      port = parseInt(url.port, 10) || 6379;
    } catch { /* use defaults */ }
  }

  if (!process.env.REDIS_PASSWORD) {
    logger.warn("[REDIS] No REDIS_PASSWORD - using in-memory fallback");
    useMemoryFallback = true;
  } else {
    redis = new Redis({
      host,
      port,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      keyPrefix: "mynsadesk_",
      connectTimeout: 5000,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      if (!useMemoryFallback) {
        logger.warn("[REDIS] Connection error - falling back to memory", { error: err.message });
        useMemoryFallback = true;
      }
    });

    redis.on("connect", () => {
      logger.log("[REDIS] Connected successfully");
      useMemoryFallback = false;
    });

    redis.connect().catch((err) => {
      logger.warn("[REDIS] Initial connection failed - using memory fallback", { error: err.message });
      useMemoryFallback = true;
    });
  }
} catch (err: any) {
  logger.warn("[REDIS] Init failed - using memory fallback", { error: err?.message });
  useMemoryFallback = true;
}

async function storeSet(key: string, value: string, ttl: number): Promise<void> {
  if (!useMemoryFallback && redis) {
    try { await redis.set(key, value, "EX", ttl); return; } catch { useMemoryFallback = true; }
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

async function storeGet(key: string): Promise<string | null> {
  if (!useMemoryFallback && redis) {
    try { return await redis.get(key); } catch { useMemoryFallback = true; }
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memoryStore.delete(key); return null; }
  return entry.value;
}

async function storeDel(key: string): Promise<void> {
  if (!useMemoryFallback && redis) {
    try { await redis.del(key); return; } catch { useMemoryFallback = true; }
  }
  memoryStore.delete(key);
}

@Injectable()
export class RedisService {
  async createSession(userId: string): Promise<string> {
    const sessionId = `sess:${userId}:${Date.now()}`;
    await storeSet(
      sessionId,
      JSON.stringify({ userId }),
      60 * 60 * 24 * 7,
    ); // 7 days
    return sessionId;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await storeDel(sessionId);
  }

  async getSession(sessionId: string): Promise<any> {
    const data = await storeGet(sessionId);
    return data ? JSON.parse(data) : null;
  }
}

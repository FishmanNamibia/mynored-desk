import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class SessionService {
  private redisClient: Redis | null = null;
  private memoryStore: Map<string, { value: string; expiresAt: number }> = new Map();
  private useMemoryFallback = false;
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly jwtService: JwtService) {
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn(
        "[SESSION] REDIS_URL not set - using in-memory session store (NOT for production)",
      );
      this.useMemoryFallback = true;
      return;
    }

    // Parse host/port from REDIS_URL if available, otherwise use defaults
    let host = '172.16.192.63';
    let port = 6379;
    try {
      const url = new URL(redisUrl);
      host = url.hostname;
      port = parseInt(url.port, 10) || 6379;
    } catch {
      this.logger.warn("[SESSION] Failed to parse REDIS_URL, using defaults");
    }

    this.logger.log("[SESSION] Initializing Redis client", { host, port });

    try {
      this.redisClient = new Redis(redisUrl, {
        password: redisPassword || undefined,
        maxRetriesPerRequest: 3,
        keyPrefix: "mynsadesk_",
        connectTimeout: 5000,
        lazyConnect: true,
      });

      // Handle connection errors gracefully
      this.redisClient.on("error", (err) => {
        if (!this.useMemoryFallback) {
          this.logger.warn("[SESSION] Redis connection error - falling back to in-memory store", {
            error: err.message,
          });
          this.useMemoryFallback = true;
        }
      });

      this.redisClient.on("connect", () => {
        this.logger.log("[SESSION] Redis connected successfully");
        this.useMemoryFallback = false;
      });

      // Attempt initial connection
      this.redisClient.connect().catch((err) => {
        this.logger.warn("[SESSION] Redis initial connection failed - using in-memory fallback", {
          error: err.message,
        });
        this.useMemoryFallback = true;
      });
    } catch (err: any) {
      this.logger.warn("[SESSION] Failed to initialize Redis client - using in-memory fallback", {
        error: err?.message,
      });
      this.useMemoryFallback = true;
    }
  }

  private async storeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.useMemoryFallback && this.redisClient) {
      try {
        await this.redisClient.set(key, value, "EX", ttlSeconds);
        return;
      } catch (err: any) {
        this.logger.warn("[SESSION] Redis SET failed, using memory fallback", { error: err?.message });
        this.useMemoryFallback = true;
      }
    }
    // In-memory fallback
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private async storeGet(key: string): Promise<string | null> {
    if (!this.useMemoryFallback && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch (err: any) {
        this.logger.warn("[SESSION] Redis GET failed, using memory fallback", { error: err?.message });
        this.useMemoryFallback = true;
      }
    }
    // In-memory fallback
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  private async storeDel(key: string): Promise<void> {
    if (!this.useMemoryFallback && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err: any) {
        this.logger.warn("[SESSION] Redis DEL failed, using memory fallback", { error: err?.message });
        this.useMemoryFallback = true;
      }
    }
    // In-memory fallback
    this.memoryStore.delete(key);
  }

  async createSession(
    userId: string,
    roles: string[] = [],
  ): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
    const sessionId = `session:${userId}:${Date.now()}`;
    this.logger.log("[SESSION] Creating session", { userId, sessionId, store: this.useMemoryFallback ? "memory" : "redis" });
    // Store minimal session context; roles are also embedded
    // into the signed JWTs so they are available to guards and callers.
    await this.storeSet(
      sessionId,
      JSON.stringify({ userId, roles }),
      60 * 60 * 24 * 7,
    ); // 7 days expiration

    this.logger.debug("[SESSION] Generating JWT access and refresh tokens", {
      userId,
      sessionId,
    });

    const accessToken = this.jwtService.sign(
      { userId, sessionId, roles },
      { expiresIn: "15m" },
    );
    const refreshToken = this.jwtService.sign(
      { userId, sessionId, roles },
      { expiresIn: "7d" },
    );

    this.logger.log("[SESSION] Session created successfully", { sessionId });

    return { sessionId, accessToken, refreshToken };
  }

  async invalidateSession(sessionId: string): Promise<void> {
    this.logger.log("[SESSION] Invalidating session", { sessionId });
    await this.storeDel(sessionId);
  }

  async validateSession(sessionId: string): Promise<boolean> {
    this.logger.debug("[SESSION] Validating session", { sessionId });
    const data = await this.storeGet(sessionId);
    const valid = !!data;
    this.logger.debug("[SESSION] Session validation result", {
      sessionId,
      valid,
    });
    return valid;
  }
}

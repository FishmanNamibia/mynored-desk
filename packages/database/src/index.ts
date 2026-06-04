import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Use a shared pg Pool and Prisma adapter for Prisma 7 "client" engine
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Initialize PrismaClient with stable global instance
const globalForPrisma: any = globalThis as any;
export const prisma: PrismaClient =
  globalForPrisma.prismaClient ??
  new PrismaClient({
    log: ["query", "info", "warn", "error"],
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClient = prisma;
}

export { PrismaClient };
export default prisma;

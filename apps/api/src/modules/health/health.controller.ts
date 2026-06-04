import { Controller, Get } from "@nestjs/common";
import { prisma } from "@mynsa-desk/database";

@Controller("health")
export class HealthController {
  @Get()
  async get() {
    try {
      // Simple query to verify DB connectivity
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch (err) {
      return { status: "error", detail: String(err) };
    }
  }
}

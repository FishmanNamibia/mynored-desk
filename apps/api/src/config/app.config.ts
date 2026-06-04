import { registerAs } from "@nestjs/config";

export const appConfigFactory = () => ({
  port: parseInt(process.env.API_PORT ?? process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN,
});

export type AppConfig = ReturnType<typeof appConfigFactory>;

export default registerAs("app", appConfigFactory);

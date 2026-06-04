import { registerAs } from "@nestjs/config";

export const databaseConfigFactory = () => ({
  url: process.env.DATABASE_URL,
});

export type DatabaseConfig = ReturnType<typeof databaseConfigFactory>;

export default registerAs("database", databaseConfigFactory);

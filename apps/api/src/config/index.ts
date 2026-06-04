import { ConfigService } from "@nestjs/config";

export const config = (configService: ConfigService) => ({
  port: configService.get<number>("PORT") || 3000,
  database: {
    host: configService.get<string>("DB_HOST") || "localhost",
    port: configService.get<number>("DB_PORT") || 5432,
    username: configService.get<string>("DB_USERNAME") || "user",
    password: configService.get<string>("DB_PASSWORD") || "password",
    database: configService.get<string>("DB_NAME") || "my_nsa_desk",
  },
  jwt: {
    secret: configService.get<string>("JWT_SECRET"),
    expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "1h",
  },
});

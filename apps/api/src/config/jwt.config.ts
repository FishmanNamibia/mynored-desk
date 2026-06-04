import { registerAs } from "@nestjs/config";

export const jwtConfigFactory = () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN,
});

export type JwtConfig = ReturnType<typeof jwtConfigFactory>;

export default registerAs("jwt", jwtConfigFactory);

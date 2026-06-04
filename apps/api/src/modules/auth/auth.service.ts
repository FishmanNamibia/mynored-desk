import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { AuthCredentialsDto } from "./dto/auth-credentials.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

@Injectable()
export class AuthService {
  private readonly passwordHashPrefix = "scrypt";

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private getRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException("JWT refresh secret is not configured");
    }
    return secret;
  }

  private verifyPassword(storedPassword: string, password: string): boolean {
    if (!storedPassword || !password) {
      return false;
    }

    if (storedPassword.startsWith(`${this.passwordHashPrefix}:`)) {
      const [, salt, hash] = storedPassword.split(":");
      if (!salt || !hash) {
        return false;
      }

      const expected = Buffer.from(hash, "hex");
      const derived = scryptSync(password, salt, expected.length);

      return (
        expected.length === derived.length &&
        timingSafeEqual(expected, derived)
      );
    }

    return storedPassword === password;
  }

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${this.passwordHashPrefix}:${salt}:${hash}`;
  }

  async authenticateUser(authCredentialsDto: AuthCredentialsDto): Promise<any> {
    const user = await this.usersService.findOne(authCredentialsDto.username);
    if (!user || !this.verifyPassword(user.password, authCredentialsDto.password)) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const fullUser = await this.usersService.findById(user.id);
    if (!fullUser) {
      throw new UnauthorizedException("User not found");
    }

    return fullUser;
  }

  async validateUser(authCredentialsDto: AuthCredentialsDto): Promise<any> {
    try {
      const user = await this.authenticateUser(authCredentialsDto);
      const { password, ...result } = user;
      return result;
    } catch {
      return null;
    }
  }

  async login(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; email: string };
  }> {
    const user = await this.authenticateUser(authCredentialsDto);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "15m",
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: "7d",
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.getRefreshSecret(),
      });

      const user = await this.usersService.findOne(payload.username);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        email: user.email,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: "15m",
      });

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async logout(): Promise<{ message: string }> {
    // In a real implementation, you would invalidate the token in Redis
    // For now, this is a placeholder
    return { message: "Logged out successfully" };
  }
}

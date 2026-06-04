import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Get,
  Res,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { SessionGuard } from "./guards/session.guard";
import { UsersService } from "../users/users.service";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { SessionService } from "./session.service";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  private getCookieOptions(maxAge: number) {
    const isProduction = this.configService.get("NODE_ENV") === "production";
    const cookieDomain = this.configService.get<string>("COOKIE_DOMAIN");

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
      maxAge,
      ...(cookieDomain && { domain: cookieDomain }),
    };
  }

  private serializeUser(user: any) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: [user.firstName, user.lastName].filter(Boolean).join(" "),
      jobTitle: user.jobTitle,
      department: user.departmentName,
      division: user.divisionName,
      companyName: user.companyName,
      lastLoginAt: user.lastLoginAt,
      profilePictureUrl: user.profilePictureUrl,
      roles:
        user.roles?.map((ur: any) => ur.role?.name).filter(Boolean) || [],
    };
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const user = await this.authService.authenticateUser(loginDto);
    const roles =
      user.roles?.map((ur: any) => ur.role?.name).filter(Boolean) || [];

    const session = await this.sessionService.createSession(user.id, roles);

    res.cookie(
      "mynsa_access_token",
      session.accessToken,
      this.getCookieOptions(15 * 60 * 1000),
    );
    res.cookie(
      "mynsa_refresh_token",
      session.refreshToken,
      this.getCookieOptions(7 * 24 * 60 * 60 * 1000),
    );

    await this.usersService.update(user.id, { lastLoginAt: new Date() });

    const refreshedUser = await this.usersService.findById(user.id);

    this.logger.log(`[AUTH/LOGIN] Session created for user ${user.email}`);

    return {
      success: true,
      user: this.serializeUser(refreshedUser),
    };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<any> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * Refresh access token using HttpOnly refresh cookie (mynsa_refresh_token).
   *
   * This is used by the SPA when /auth/me returns 401 so that we can
   * transparently issue a new short-lived access token without forcing
   * the user through the Microsoft login flow again, as long as the
   * refresh token cookie is still valid.
   */
  @Post("refresh-session")
  @HttpCode(200)
  async refreshSession(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const refreshToken =
      req.cookies?.mynsa_refresh_token || req.cookies?.refreshToken;

    if (!refreshToken) {
      this.logger.warn(
        "[AUTH/REFRESH-SESSION] No refresh token cookie found on request",
      );
      throw new UnauthorizedException("Refresh token missing");
    }

    try {
      const payload: any = this.jwtService.verify(refreshToken);
      const { userId, sessionId, roles } = payload || {};

      if (!userId || !sessionId) {
        this.logger.warn(
          "[AUTH/REFRESH-SESSION] Refresh token missing required claims",
          { userId, sessionId },
        );
        throw new UnauthorizedException("Invalid refresh token");
      }

      const accessToken = this.jwtService.sign(
        { userId, sessionId, roles },
        { expiresIn: "15m" },
      );

      res.cookie(
        "mynsa_access_token",
        accessToken,
        this.getCookieOptions(15 * 60 * 1000),
      );

      this.logger.log(
        `[AUTH/REFRESH-SESSION] Access token refreshed for user ${userId}`,
      );

      return { success: true };
    } catch (error: any) {
      this.logger.warn(
        "[AUTH/REFRESH-SESSION] Refresh token verification failed",
        error?.message,
      );
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  @Post("logout")
  @UseGuards(SessionGuard)
  @HttpCode(200)
  async logout(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    // Invalidate backend session in Redis (best-effort)
    const sessionId = req.user?.sessionId as string | undefined;
    if (sessionId) {
      try {
        await this.sessionService.invalidateSession(sessionId);
      } catch (err) {
        this.logger.warn("[LOGOUT] Failed to invalidate session in Redis", {
          sessionId,
          error: (err as any)?.message,
        });
      }
    } else {
      this.logger.warn("[LOGOUT] No sessionId found on JWT payload for user", {
        userId: req.user?.userId,
      });
    }

    // Clear cookies on the client
    const cookieOptions = this.getCookieOptions(0);

    res.clearCookie("mynsa_access_token", cookieOptions);
    res.clearCookie("mynsa_refresh_token", cookieOptions);

    this.logger.log(`[LOGOUT] User ${req.user?.userId} logged out`);

    return { success: true, message: "Logged out successfully" };
  }

  @Get("me")
  @UseGuards(SessionGuard)
  async me(@Request() req: any): Promise<any> {
    const payload = req.user as any;
    const user = await this.usersService.findById(payload.userId);

    if (!user) {
      this.logger.warn(`[AUTH/ME] User not found: ${payload.userId}`);
      return { user: null };
    }

    return {
      user: this.serializeUser(user),
    };
  }
}

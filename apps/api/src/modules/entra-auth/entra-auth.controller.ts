import {
  Controller,
  Post,
  Get,
  BadRequestException,
  Req,
  Res,
  Logger,
  HttpStatus,
  HttpException,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { Response } from "express";
import { EntraAuthService } from "./entra-auth.service";
import { ConfigService } from "@nestjs/config";
import { SessionGuard } from "../auth/guards/session.guard";
import { SessionService } from "../auth/session.service";

@Controller("auth/entra")
export class EntraAuthController {
  private readonly logger = new Logger(EntraAuthController.name);

  constructor(
    private readonly entraAuthService: EntraAuthService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {}

  private hasManagerSyncAccess(req: any): boolean {
    const roles = Array.isArray(req?.user?.roles)
      ? req.user.roles.map((r: unknown) => String(r).toUpperCase())
      : [];

    return roles.some(
      (role: string) =>
        role.includes("ADMIN") ||
        role.includes("EXECUTIVE") ||
        role === "SG" ||
        role === "DEPUTY_SG",
    );
  }

  @Post("login")
  async entraLogin(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    this.logger.log("[ENTRA LOGIN] Endpoint hit");

    try {
      // Extract Bearer token
      const authHeader =
        req.headers?.authorization || req.headers?.Authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        this.logger.warn("[ENTRA LOGIN] Missing or invalid auth header");
        throw new BadRequestException("Missing Authorization Bearer token");
      }

      const token = authHeader.split(" ")[1];
      const graphAccessToken = req.body?.graphAccessToken as string | undefined;

      if (!token) {
        this.logger.warn("[ENTRA LOGIN] Empty token");
        throw new BadRequestException("Invalid Authorization header format");
      }

      this.logger.log(
        `[ENTRA LOGIN] Token received (length: ${token?.length})`,
      );

      // Validate token and create session
      const result = await this.entraAuthService.loginWithAzureToken(
        token,
        graphAccessToken,
      );

      // Get cookie configuration
      const isProduction = this.configService.get("NODE_ENV") === "production";
      const cookieDomain = this.configService.get<string>("COOKIE_DOMAIN");

      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        ...(cookieDomain && { domain: cookieDomain }),
      };

      // Set HTTP-only cookies
      res.cookie("mynsa_access_token", result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("mynsa_refresh_token", result.refreshToken, cookieOptions);

      this.logger.log(
        `[ENTRA LOGIN] Session created for user: ${result.user.email}`,
      );

      // Return user info (without tokens in body for security)
      return {
        success: true,
        user: result.user,
      };
    } catch (error: any) {
      this.logger.error(
        "[ENTRA LOGIN] Error during login",
        error?.stack || error,
      );

      // If this is an HttpException (e.g. 400/401/500 we threw),
      // extract its response so the frontend can see the real message.
      // Use duck-typing instead of instanceof to avoid module duplication issues.
      if (
        error instanceof HttpException ||
        (typeof error?.getStatus === "function" &&
          typeof error?.getResponse === "function")
      ) {
        const status = error.getStatus();
        const response = error.getResponse();

        if (typeof response === "string") {
          res.status(status).json({
            statusCode: status,
            message: response,
          });
        } else {
          res.status(status).json(response as any);
        }

        return;
      }

      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      const rawMessage = error?.message || "Azure login failed";
      const message = rawMessage.startsWith("ENTRA_LOGIN_UNEXPECTED_ERROR")
        ? rawMessage
        : `ENTRA_LOGIN_UNEXPECTED_ERROR: ${rawMessage}`;

      this.logger.error("[ENTRA LOGIN] Non-HttpException error details", {
        errorName: error?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
      });

      res.status(status).json({
        statusCode: status,
        message,
        error: "Internal Server Error",
      });

      return;
    }
  }

  @Post("logout")
  @UseGuards(SessionGuard)
  async entraLogout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const sessionId = req.user?.sessionId as string | undefined;
    const userId = req.user?.userId as string | undefined;

    if (sessionId) {
      try {
        await this.sessionService.invalidateSession(sessionId);
        this.logger.log("[ENTRA LOGOUT] Session invalidated", {
          sessionId,
          userId,
        });
      } catch (err) {
        this.logger.warn("[ENTRA LOGOUT] Failed to invalidate session", {
          sessionId,
          userId,
          error: (err as any)?.message,
        });
      }
    } else {
      this.logger.warn("[ENTRA LOGOUT] No sessionId found on JWT payload", {
        userId,
      });
    }

    const cookieOptions = {
      httpOnly: true,
      secure: this.configService.get("NODE_ENV") === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    res.clearCookie("mynsa_access_token", cookieOptions);
    res.clearCookie("mynsa_refresh_token", cookieOptions);

    return { success: true, message: "Logged out successfully" };
  }

  @Post("sync-managers")
  @UseGuards(SessionGuard)
  async syncManagers(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    this.logger.log("[SYNC MANAGERS] Bulk manager sync triggered");

    try {
      if (!this.hasManagerSyncAccess(req)) {
        throw new ForbiddenException(
          "Insufficient permissions for manager synchronization",
        );
      }

      const result = await this.entraAuthService.bulkSyncManagers();
      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      this.logger.error("[SYNC MANAGERS] Error", error?.message);
      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        success: false,
        error: error?.message || "Failed to sync managers",
      });
    }
  }
}

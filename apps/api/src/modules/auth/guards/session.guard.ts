import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * SessionGuard - Production-ready cookie-based authentication guard
 *
 * Validates HTTP-only session cookies set by the backend.
 * This guard:
 * 1. Extracts access token from mynsa_access_token cookie
 * 2. Verifies JWT signature and expiration
 * 3. Attaches decoded payload to request.user
 * 4. Throws UnauthorizedException if validation fails
 *
 * Use this guard on protected endpoints that require authentication.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract token from cookie
    const accessToken =
      request.cookies?.mynsa_access_token || request.cookies?.accessToken;

    if (!accessToken) {
      this.logger.warn("[SESSION GUARD] No access token cookie found");
      throw new UnauthorizedException("Authentication required");
    }

    try {
      // Verify JWT and decode payload
      const payload = this.jwtService.verify(accessToken);

      // Attach user info to request for downstream use
      request.user = payload;

      this.logger.debug(
        `[SESSION GUARD] Authenticated user: ${payload.userId}`,
      );
      return true;
    } catch (error: any) {
      this.logger.warn(
        `[SESSION GUARD] Token verification failed: ${error?.message}`,
      );
      throw new UnauthorizedException("Invalid or expired session");
    }
  }
}

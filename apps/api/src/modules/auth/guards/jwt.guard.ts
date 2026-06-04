import {
  Injectable,
  UnauthorizedException,
  CanActivate,
  ExecutionContext,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import jwksClient from "jwks-rsa";
import * as jwt from "jsonwebtoken";
import { UsersService } from "../../users/users.service";

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);
  private jwks: jwksClient.JwksClient | null = null;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token = this.extractTokenFromHeader(request);

    // Also check cookie-based server token (fall back)
    if (!token && request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    // First try internal server JWT verification
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch (internalErr) {
      this.logger.debug("Internal JWT verification failed; trying Azure JWKS", {
        message: (internalErr as any)?.message,
      });
    }

    // Fallback to Azure token verification via JWKS
    const azureIssuer = this.configService.get<string>("AZURE_ISSUER");
    const azureApiClientId =
      this.configService.get<string>("AZURE_API_CLIENT_ID") ||
      this.configService.get<string>("AZURE_CLIENT_ID");
    const azureTenantId = this.configService.get<string>("AZURE_TENANT_ID");

    if (!azureIssuer || !azureApiClientId) {
      this.logger.warn("Azure config missing for JWKS verification");
      throw new UnauthorizedException("Token verification failed");
    }

    // Ensure jwks client exists
    if (!this.jwks) {
      this.jwks = jwksClient({
        jwksUri: `${azureIssuer}/discovery/v2.0/keys`,
        cache: true,
        rateLimit: true,
      });
    }

    const decoded: any = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string" || !decoded.header?.kid) {
      this.logger.warn("Invalid token header for Azure verification");
      throw new UnauthorizedException("Invalid token");
    }

    let key;
    try {
      key = await this.jwks.getSigningKey(decoded.header.kid);
    } catch (err) {
      this.logger.warn(
        "Failed to fetch JWKS signing key",
        (err as any)?.message || err,
      );
      throw new UnauthorizedException("Invalid token signature");
    }

    const publicKey = key.getPublicKey();

    try {
      const payload: any = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
        issuer: azureIssuer,
        audience: azureApiClientId,
      }) as any;

      // Validate tenant
      if (azureTenantId && payload.tid !== azureTenantId) {
        this.logger.warn("Azure token tenant mismatch", {
          expected: azureTenantId,
          found: payload.tid,
        });
        throw new UnauthorizedException("Invalid tenant");
      }

      // Map or create local user and attach to request
      const oid = payload.oid || payload.sub;
      const email = payload.email || payload.upn;
      const name = payload.name;

      if (!oid || !email) {
        this.logger.warn("Azure token missing identifiers", { oid, email });
        throw new UnauthorizedException("Invalid token claims");
      }

      const user = await this.usersService.findOrCreateAzureUser({
        azureOid: oid,
        email,
        displayName: name,
      });
      request.user = { userId: user.id };
      return true;
    } catch (err: any) {
      this.logger.warn("Azure token verification failed", {
        message: err?.message || String(err),
      });
      throw new UnauthorizedException("Invalid token");
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const header =
      request.headers?.authorization || request.headers?.Authorization;
    if (!header) return undefined;
    const [type, token] = header.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}

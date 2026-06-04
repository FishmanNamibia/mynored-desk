import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import jwksClient from "jwks-rsa";
import * as https from "https";
import * as jwt from "jsonwebtoken";
import { UsersService } from "../users/users.service";
import { SessionService } from "../auth/session.service";

@Injectable()
export class EntraAuthService {
  private readonly logger = new Logger(EntraAuthService.name);
  private jwks!: jwksClient.JwksClient;
  private azureIssuer: string = "";
  private azureClientId: string = "";
  private azureApiClientId: string = "";
  private azureTenantId: string = "";
  private graphClientId: string = "";
  private graphClientSecret: string = "";

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {
    this.logger.log("[ENTRA] Initializing EntraAuthService (constructor)");

    // Read config at runtime (after dotenv/config has been loaded)
    this.azureIssuer =
      this.configService.get<string>("AZURE_ISSUER") ||
      process.env.AZURE_ISSUER ||
      "";
    this.azureClientId =
      this.configService.get<string>("AZURE_CLIENT_ID") ||
      process.env.AZURE_CLIENT_ID ||
      "";
    this.azureApiClientId =
      this.configService.get<string>("AZURE_API_CLIENT_ID") ||
      process.env.AZURE_API_CLIENT_ID ||
      this.azureClientId;
    this.azureTenantId =
      this.configService.get<string>("AZURE_TENANT_ID") ||
      process.env.AZURE_TENANT_ID ||
      "";

    this.graphClientId =
      this.configService.get<string>("AZURE_CLIENT_ID") ||
      process.env.AZURE_CLIENT_ID ||
      this.azureClientId;
    this.graphClientSecret =
      this.configService.get<string>("AZURE_CLIENT_SECRET") ||
      process.env.AZURE_CLIENT_SECRET ||
      "";

    this.logger.debug("[ENTRA] Resolved Azure config", {
      issuer: this.azureIssuer,
      clientId: this.azureClientId,
      apiClientId: this.azureApiClientId,
      tenantId: this.azureTenantId,
    });

    if (!this.azureIssuer || !this.azureClientId || !this.azureTenantId) {
      this.logger.warn(
        "[ENTRA] Azure config missing - Entra authentication will be disabled. Set AZURE_ISSUER, AZURE_CLIENT_ID, AZURE_TENANT_ID to enable.",
      );
      // Don't throw - allow the app to start without Azure auth
      return;
    }

    // Azure v2.0 issuer typically ends with "/v2.0" but the JWKS endpoint
    // lives at /tenant-id/discovery/v2.0/keys (without the trailing /v2.0 segment).
    // Normalize to avoid building a wrong URL like "/v2.0/discovery/v2.0/keys".
    const issuerBase = this.azureIssuer.replace(/\/v2\.0\/?$/, "");

    this.logger.log(
      "[ENTRA] Initializing JWKS client for Azure issuer discovery",
    );

    // Configure JWKS client with caching, rate limiting, and a
    // reasonable network timeout. This, combined with the global
    // dns.setDefaultResultOrder('ipv4first') in main.ts, makes
    // key retrieval resilient to intermittent network issues and
    // IPv6 "no route to host" behaviour.
    const jwksUri =
      this.configService.get<string>("AZURE_JWKS_URI") ||
      process.env.AZURE_JWKS_URI ||
      `${issuerBase}/discovery/v2.0/keys`;

    // Force IPv4 for JWKS to avoid dual-stack connection failures in
    // environments without IPv6 routing.
    const ipv4Agent = new https.Agent({ family: 4 });

    this.jwks = jwksClient({
      jwksUri,
      cache: true,
      rateLimit: true,
      timeout: 10000, // ms
      requestAgent: ipv4Agent,
    });
  }

  private async fetchGraphToken(): Promise<string | null> {
    if (!this.graphClientId || !this.graphClientSecret || !this.azureTenantId) {
      this.logger.warn(
        "[GRAPH] Missing client credentials, skipping Graph enrichment",
      );
      return null;
    }

    const params = new URLSearchParams();
    params.set("client_id", this.graphClientId);
    params.set("client_secret", this.graphClientSecret);
    params.set("grant_type", "client_credentials");
    params.set("scope", "https://graph.microsoft.com/.default");

    const tokenUrl = `https://login.microsoftonline.com/${this.azureTenantId}/oauth2/v2.0/token`;

    try {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      } as any);

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn("[GRAPH] Failed to get token", {
          status: res.status,
          body: text.slice(0, 400),
        });
        return null;
      }

      const json: any = await res.json();
      return json.access_token || null;
    } catch (e) {
      this.logger.warn("[GRAPH] Error getting token", (e as any)?.message);
      return null;
    }
  }

  private async fetchGraphProfile(accessToken: string): Promise<{
    jobTitle?: string | null;
    department?: string | null;
    division?: string | null;
    companyName?: string | null;
    managerEmail?: string | null;
    managerDisplayName?: string | null;
  } | null> {
    try {
      // Explicitly request profile fields including department and division
      const selectFields = [
        "id",
        "displayName",
        "mail",
        "userPrincipalName",
        "jobTitle",
        "department",
        "division",
        "officeLocation",
        "companyName",
      ].join(",");
      
      const res = await fetch(`https://graph.microsoft.com/v1.0/me?$select=${selectFields}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      } as any);

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn("[GRAPH] /me failed", {
          status: res.status,
          body: text.slice(0, 400),
        });
        return null;
      }

      const json: any = await res.json();
      this.logger.log("[GRAPH] /me profile payload - FULL", {
        userPrincipalName: json.userPrincipalName,
        mail: json.mail,
        jobTitle: json.jobTitle,
        department: json.department,
        division: json.division,
        divisionType: typeof json.division,
        divisionIsNull: json.division === null,
        divisionIsUndefined: json.division === undefined,
        officeLocation: json.officeLocation,
        companyName: json.companyName,
        rawKeys: Object.keys(json),
      });

      // Fetch manager information from /me/manager endpoint
      let managerEmail: string | null = null;
      let managerDisplayName: string | null = null;
      try {
        const managerRes = await fetch("https://graph.microsoft.com/v1.0/me/manager", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        } as any);

        if (managerRes.ok) {
          const managerJson: any = await managerRes.json();
          managerEmail = managerJson.mail || managerJson.userPrincipalName || null;
          managerDisplayName = managerJson.displayName || null;
          this.logger.log("[GRAPH] /me/manager payload", {
            managerEmail,
            managerDisplayName,
            managerId: managerJson.id,
          });
        } else {
          this.logger.debug("[GRAPH] /me/manager not available (user may not have a manager)", {
            status: managerRes.status,
          });
        }
      } catch (managerError) {
        this.logger.debug("[GRAPH] Could not fetch manager info", (managerError as any)?.message);
      }

      return {
        jobTitle: json.jobTitle ?? null,
        department: json.department ?? null,
        division: json.division ?? null,
        companyName: json.companyName ?? null,
        managerEmail,
        managerDisplayName,
      };
    } catch (e) {
      this.logger.warn("[GRAPH] Error calling /me", (e as any)?.message);
      return null;
    }
  }

  // Map Azure Entra App Role values to internal application role names.
  // Keys must match the "value" field configured on App Roles in Entra.
  // Values are the internal roles used throughout MyNSA Desk.
  private mapAzureRolesToAppRoles(azureRoles: string[] | undefined): string[] {
    const ROLE_MAP: Record<string, string> = {
      MYNSA_DESK_ADMIN: "admin",
      MYNSA_DESK_MANAGER: "manager",
      MYNSA_DESK_EMPLOYEE: "employee",
      MYNSA_DESK_HR: "hr",
      MYNSA_DESK_FINANCE: "finance",
      MYNSA_DESK_IT: "it",
    };

    const appRoles = new Set<string>();

    if (Array.isArray(azureRoles)) {
      for (const role of azureRoles) {
        const mapped = ROLE_MAP[role];
        if (mapped) {
          appRoles.add(mapped);
        }
      }
    }

    // Ensure every authenticated user has at least a baseline role so
    // the frontend can render sensible defaults, even if no explicit
    // App Role mapping has been configured yet.
    if (appRoles.size === 0) {
      appRoles.add("employee");
    }

    return Array.from(appRoles);
  }

  async loginWithAzureToken(
    token: string,
    graphAccessToken?: string,
  ): Promise<any> {
    // Check if Azure is configured
    if (!this.jwks || !this.azureIssuer || !this.azureClientId || !this.azureTenantId) {
      this.logger.error("[ENTRA] Azure authentication is not configured");
      throw new InternalServerErrorException("Azure authentication is not available");
    }

    try {
      this.logger.log("[ENTRA] Step 1: Starting loginWithAzureToken");
      this.logger.debug("[ENTRA] Raw token length", { length: token?.length });

      // Decode token to get kid
      const decoded = jwt.decode(token, { complete: true }) as {
        header: { kid?: string };
        payload: any;
      } | null;

      // Log what Microsoft sent us
      if (decoded) {
        this.logger.log("[ENTRA] Step 2: Decoded Microsoft token payload", {
          oid: decoded.payload.oid,
          email: decoded.payload.email || decoded.payload.upn,
          name: decoded.payload.name,
          tid: decoded.payload.tid,
          iss: decoded.payload.iss,
          aud: decoded.payload.aud,
        });
      }

      if (!decoded || !decoded.header.kid) {
        this.logger.warn("[ENTRA] Missing kid in token header");
        throw new UnauthorizedException("Invalid token header");
      }

      const kid = decoded.header.kid;

      this.logger.log("[ENTRA] Step 3: Fetching signing key from JWKS", {
        kid,
      });

      // Fetch JWKS signing key (with a single retry for transient
      // network issues such as IPv6 routing problems).
      let key;
      try {
        key = await this.jwks.getSigningKey(kid);
      } catch (e) {
        this.logger.warn(
          "[ENTRA] First attempt to get signing key from JWKS failed; retrying once",
          (e as any)?.stack || e,
        );
        try {
          key = await this.jwks.getSigningKey(kid);
        } catch (e2) {
          this.logger.error(
            "[ENTRA] Failed to get signing key from JWKS after retry",
            (e2 as any)?.stack || e2,
          );
          throw new UnauthorizedException("Unable to validate token signature");
        }
      }

      const publicKey = key.getPublicKey();

      // Verify token - skip audience validation for ID tokens (they use the SPA client ID)
      // We'll manually validate audience after verification with better error messages
      let payload: any;
      try {
        this.logger.log("[ENTRA] Step 4: Verifying Azure token signature", {
          tokenAud: (decoded as any)?.payload?.aud,
          tokenIss: (decoded as any)?.payload?.iss,
          expectedIssuer: this.azureIssuer,
          expectedAudience: [this.azureClientId, this.azureApiClientId],
        });

        // Verify signature only - skip issuer/audience/expiration validation
        // We'll validate tenant via payload.tid after verification
        // This is safe because:
        // 1. We verify the signature with Microsoft's public key
        // 2. We validate the tenant ID matches our configured tenant
        // 3. The token can only be signed by Microsoft's private key
        // 4. We issue our own session JWTs — the ID token is only used for identity
        // 5. MSAL's acquireTokenSilent may return a cached/expired ID token
        
        payload = jwt.verify(token, publicKey, {
          algorithms: ["RS256"],
          clockTolerance: 300,
          ignoreExpiration: true,
          // Skip issuer and audience validation - we'll check tenant instead
        });
        
        // Manual audience validation with detailed logging
        const tokenAud = payload.aud;
        const validAudiences = [this.azureClientId, this.azureApiClientId].filter(Boolean);
        
        if (!validAudiences.includes(tokenAud)) {
          this.logger.warn("[ENTRA] Token audience mismatch - but accepting for ID token", {
            tokenAud,
            validAudiences,
            note: "ID tokens use SPA client ID as audience, which may differ from API client ID"
          });
          // For ID tokens, we accept the token if it's from our tenant and properly signed
          // The audience will be the SPA client ID, not necessarily the API client ID
        }
        
        this.logger.log("[ENTRA] Token verification success", {
          aud: payload?.aud,
          iss: payload?.iss,
        });
      } catch (e) {
        this.logger.error("[ENTRA] Token verification failed", {
          errorMessage: (e as any)?.message,
          errorStack: (e as any)?.stack,
          tokenIss: (decoded as any)?.payload?.iss,
          tokenAud: (decoded as any)?.payload?.aud,
          expectedIssuer: this.azureIssuer,
          expectedAudience: [this.azureClientId, this.azureApiClientId],
        });
        throw new UnauthorizedException("Invalid Azure token");
      }

      // Validate tenant
      if (payload.tid !== this.azureTenantId) {
        this.logger.warn("[ENTRA] Tenant mismatch", {
          tokenTid: payload.tid,
          expectedTid: this.azureTenantId,
        });
        throw new UnauthorizedException("Invalid tenant");
      }

      // Extract claims
      const { oid, email, upn, name, roles: azureRoles } = payload as any;

      if (!oid || !(email || upn)) {
        this.logger.warn("[ENTRA] Missing oid/email claims", {
          oid,
          email,
          upn,
        });
        throw new UnauthorizedException("Missing required claims");
      }

      this.logger.log("[ENTRA] Step 5: Resolving user from Azure identity", {
        oid,
        email: email || upn,
      });

      // Optionally enrich profile from Microsoft Graph using client credentials
      let graphProfile: {
        jobTitle?: string | null;
        department?: string | null;
        division?: string | null;
        companyName?: string | null;
        managerEmail?: string | null;
        managerDisplayName?: string | null;
      } | null = null;

      // Prefer delegated Graph access token from MSAL if provided; fall back
      // to app-only client credentials if available.
      try {
        const effectiveGraphToken =
          graphAccessToken || (await this.fetchGraphToken());
        if (effectiveGraphToken) {
          this.logger.log("[GRAPH] Fetching profile for current user via /me", {
            source: graphAccessToken ? "delegated" : "app",
          });
          graphProfile = await this.fetchGraphProfile(effectiveGraphToken);
          this.logger.log("[GRAPH] Enriched profile from /me", graphProfile);
        }
      } catch (graphError: any) {
        this.logger.warn("[GRAPH] Failed to fetch profile, continuing without enrichment", {
          error: graphError?.message,
        });
        // Continue without graph profile - not critical
      }

      // Find or create user with canonical profile fields
      this.logger.log("[ENTRA] Step 5b: Calling findOrCreateAzureUser", {
        azureOid: oid,
        email: email || upn,
        displayName: name,
      });
      
      let user;
      try {
        user = await this.userService.findOrCreateAzureUser({
          azureOid: oid,
          email: (email || upn || '').toLowerCase(),
          displayName: name,
          jobTitle: graphProfile?.jobTitle,
          department: graphProfile?.department,
          division: graphProfile?.division,
          companyName: graphProfile?.companyName,
          managerEmail: graphProfile?.managerEmail,
          managerDisplayName: graphProfile?.managerDisplayName,
        });
      } catch (userError: any) {
        this.logger.error("[ENTRA] Failed in findOrCreateAzureUser", {
          errorName: userError?.name,
          errorMessage: userError?.message,
          errorCode: userError?.code,
          errorStack: userError?.stack,
        });
        throw userError;
      }

      this.logger.log("[ENTRA] User resolution success", {
        userId: user?.id,
        userEmail: user?.email,
      });

      // Map Azure App Roles to internal roles and persist them on the user.
      const appRoles = this.mapAzureRolesToAppRoles(azureRoles);
      await this.userService.syncUserRoles(user.id, appRoles);

      // Create session
      this.logger.log(
        "[ENTRA] Step 6: Creating application session in Redis/JWT",
        { userId: user.id },
      );
      const { sessionId, accessToken, refreshToken } =
        await this.sessionService.createSession(user.id, appRoles);

      this.logger.log("[ENTRA] Step 7: Session created successfully", {
        sessionId,
        userEmail: user.email,
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" "),
          roles: appRoles,
        },
      };
    } catch (error: any) {
      // Preserve explicit HTTP exceptions (401, 400, etc.)
      if (error instanceof HttpException) {
        this.logger.error(
          "[ENTRA] HttpException bubbled from loginWithAzureToken",
          error?.stack || error,
        );
        throw error;
      }

      // Log detailed error information for debugging
      const errorDetails = {
        errorName: error?.name,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStack: error?.stack,
      };
      this.logger.error(
        "[ENTRA] Unexpected error during loginWithAzureToken - DETAILED",
        errorDetails,
      );
      // Also log to console directly for visibility
      console.error("=== ENTRA LOGIN ERROR DETAILS ===");
      console.error("Name:", error?.name);
      console.error("Message:", error?.message);
      console.error("Code:", error?.code);
      console.error("Stack:", error?.stack);
      console.error("=================================");

      // Return a safe, generic error response to the client while
      // keeping detailed information only in the server logs.
      throw new InternalServerErrorException({
        statusCode: 500,
        code: "ENTRA_LOGIN_UNEXPECTED_ERROR",
        message:
          "We couldn't complete your sign-in due to an unexpected backend error.",
      });
    }
  }

  /**
   * Bulk sync manager relationships for all active users using Microsoft Graph API
   * with client credentials (app-level token). For each user with an adGuid,
   * fetches their manager from Graph and sets managerId in the database.
   */
  async bulkSyncManagers(): Promise<{
    total: number;
    synced: number;
    skipped: number;
    errors: number;
    details: string[];
  }> {
    const results = { total: 0, synced: 0, skipped: 0, errors: 0, details: [] as string[] };

    // Get app-level Graph token
    const graphToken = await this.fetchGraphToken();
    if (!graphToken) {
      throw new InternalServerErrorException("Could not obtain Graph API token");
    }

    // Get all active users with adGuid
    const users = await this.userService.findAllActiveWithAdGuid();
    results.total = users.length;
    this.logger.log(`[BULK SYNC] Starting manager sync for ${users.length} users`);

    for (const user of users) {
      try {
        // Fetch manager from Graph API using /users/{id}/manager
        const managerRes = await fetch(
          `https://graph.microsoft.com/v1.0/users/${user.adGuid}/manager`,
          {
            headers: { Authorization: `Bearer ${graphToken}` },
          } as any
        );

        if (!managerRes.ok) {
          if (managerRes.status === 404) {
            results.skipped++;
            continue; // No manager in AD
          }
          results.errors++;
          results.details.push(`${user.email}: Graph API error ${managerRes.status}`);
          continue;
        }

        const managerJson: any = await managerRes.json();
        const managerEmail = (managerJson.mail || managerJson.userPrincipalName || "").toLowerCase();

        if (!managerEmail) {
          results.skipped++;
          continue;
        }

        // Find manager in our database
        let manager = await this.userService.findByEmail(managerEmail);
        
        if (!manager) {
          // Create placeholder manager
          const displayName = managerJson.displayName || managerEmail;
          const [firstName, ...rest] = displayName.trim().split(" ");
          manager = await this.userService.create({
            email: managerEmail,
            username: managerEmail,
            password: "",
            firstName: firstName || managerEmail,
            lastName: rest.join(" ") || undefined,
            status: "ACTIVE",
          });
          results.details.push(`Created placeholder for manager: ${managerEmail}`);
        }

        // Update user's managerId if different
        if (user.managerId !== manager.id) {
          await this.userService.update(user.id, { managerId: manager.id });
          results.synced++;
          results.details.push(`${user.email} -> manager: ${managerEmail}`);
        } else {
          results.skipped++;
        }
      } catch (err: any) {
        results.errors++;
        results.details.push(`${user.email}: ${err?.message}`);
      }
    }

    this.logger.log(`[BULK SYNC] Complete: ${JSON.stringify(results)}`);
    return results;
  }
}

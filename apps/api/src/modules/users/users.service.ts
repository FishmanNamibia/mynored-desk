import { Injectable, Logger } from "@nestjs/common";
import prisma from "@mynsa-desk/database";

@Injectable()
export class UsersService {
  private prisma = prisma;
  private readonly logger = new Logger(UsersService.name);

  async findOrCreateAzureUser({
    azureOid,
    email,
    displayName,
    jobTitle,
    department,
    division,
    companyName,
    managerEmail,
    managerDisplayName,
  }: {
    azureOid: string;
    email: string;
    displayName: string;
    jobTitle?: string | null;
    department?: string | null;
    division?: string | null;
    companyName?: string | null;
    managerEmail?: string | null;
    managerDisplayName?: string | null;
  }): Promise<any> {
    // Normalize email to lowercase to prevent case-mismatch ghost accounts
    email = email.toLowerCase()

    this.logger.log("[USERS] Step 1: findOrCreateAzureUser called", {
      azureOid,
      email,
      displayName,
      managerEmail,
    });

    // 1) Prefer matching by Azure AD GUID if already linked
    this.logger.debug("[USERS] Looking up user by adGuid", { azureOid });
    
    // Check if Prisma client is available
    if (!this.prisma || !this.prisma.user) {
      this.logger.error("[USERS] Prisma client not available!");
      throw new Error("Database client not initialized");
    }
    
    let user;
    try {
      this.logger.debug("[USERS] Executing Prisma findFirst query...");
      user = await this.prisma.user.findFirst({
        where: { adGuid: azureOid },
      });
      this.logger.debug("[USERS] findFirst by adGuid result", { found: !!user, userId: user?.id });
    } catch (prismaError: any) {
      this.logger.error("[USERS] Prisma error in findFirst by adGuid", {
        errorName: prismaError?.name,
        errorMessage: prismaError?.message,
        errorCode: prismaError?.code,
        errorMeta: prismaError?.meta,
      });
      throw prismaError;
    }

    // 2) If no user linked by adGuid, try matching on email
    //    This avoids unique-constraint errors when an existing
    //    local account is being converted to Azure SSO.
    if (!user) {
      this.logger.debug("[USERS] No user by adGuid, matching by email", {
        email,
      });
      user = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
      });
    }

    // Find or create manager if managerEmail is provided
    let managerId: string | null = null;
    if (managerEmail) {
      const normalizedManagerEmail = managerEmail.toLowerCase();
      this.logger.debug("[USERS] Looking up manager by email", { managerEmail: normalizedManagerEmail });
      
      let manager = await this.prisma.user.findFirst({
        where: { email: { equals: normalizedManagerEmail, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
      });

      if (!manager && managerDisplayName) {
        // Create placeholder manager user if they haven't logged in yet
        this.logger.log("[USERS] Creating placeholder manager user", {
          managerEmail: normalizedManagerEmail,
          managerDisplayName,
        });

        const trimmedName = (managerDisplayName || "").trim();
        const [firstNamePart, ...rest] = trimmedName.split(" ");

        manager = await this.prisma.user.create({
          data: {
            id: require('crypto').randomUUID(),
            updatedAt: new Date(),
            email: normalizedManagerEmail,
            username: normalizedManagerEmail,
            password: "",
            firstName: firstNamePart || normalizedManagerEmail,
            lastName: rest.join(" ") || undefined,
            status: "ACTIVE",
          },
        });

        // Assign default role for placeholder manager
        const role = await this.prisma.role.findUnique({
          where: { name: "USER" },
        });
        if (role) {
          await this.prisma.userRole.create({
            data: { id: require('crypto').randomUUID(), userId: manager.id, roleId: role.id },
          });
        }
      }

      managerId = manager?.id || null;
      this.logger.debug("[USERS] Manager resolved", { managerId, managerEmail });
    }

    if (!user) {
      // 3) No existing user – create a new Azure-backed account
      this.logger.log("[USERS] No existing user, creating new Azure user", {
        email,
        azureOid,
        managerId,
      });

      const trimmedDisplayName = (displayName || "").trim();
      const [firstNamePart, ...rest] = trimmedDisplayName.split(" ");
      const firstName = firstNamePart || email;
      const lastName = rest.join(" ") || null;

      user = await this.prisma.user.create({
        data: {
          id: require('crypto').randomUUID(),
          updatedAt: new Date(),
          email,
          username: email,
          password: "",
          firstName,
          lastName: lastName || undefined,
          adGuid: azureOid,
          jobTitle: jobTitle || undefined,
          position: jobTitle || undefined,
          departmentName: department || undefined,
          divisionName: division || undefined,
          companyName: companyName || undefined,
          ...(managerId ? { managerId } : {}),
          status: "ACTIVE",
        },
      });

      // Assign default role (e.g., USER) for brand new users
      const role = await this.prisma.role.findUnique({
        where: { name: "USER" },
      });
      if (role) {
        this.logger.debug("[USERS] Assigning default USER role", {
          userId: user.id,
          roleId: role.id,
        });
        await this.prisma.userRole.create({
          data: { id: require('crypto').randomUUID(), userId: user.id, roleId: role.id },
        });
      }
    } else {
      // 4) Existing user – ensure Azure GUID is set and
      //    update last login timestamp.
      this.logger.log(
        "[USERS] Existing user found, updating Azure GUID/login",
        {
          userId: user.id,
          currentAdGuid: user.adGuid,
          newAzureOid: azureOid,
          managerId,
        },
      );
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          adGuid: user.adGuid || azureOid,
          jobTitle: jobTitle ?? user.jobTitle,
          position: jobTitle ?? user.position,
          departmentName: department ?? user.departmentName,
          divisionName: division ?? user.divisionName,
          companyName: companyName ?? user.companyName,
          managerId: managerId ?? user.managerId,
        },
      });
    }

    this.logger.log("[USERS] Step 2: User resolved from Azure identity", {
      userId: user.id,
      userEmail: user.email,
      managerId: user.managerId,
    });

    return user;
  }

  // Synchronise user roles with roles coming from Azure Entra App Roles.
  // Azure is the source of truth for high-level roles; this method mirrors
  // those roles into the local Role/UserRole tables using the internal
  // application role names provided.
  async syncUserRoles(userId: string, roleNames: string[]): Promise<string[]> {
    const uniqueNames = Array.from(new Set(roleNames)).filter(Boolean);

    if (uniqueNames.length === 0) {
      return [];
    }

    const existingRoles = await this.prisma.role.findMany({
      where: { name: { in: uniqueNames } },
    });

    const existingNames = new Set(existingRoles.map((r) => r.name));
    const rolesToCreate = uniqueNames.filter(
      (name) => !existingNames.has(name),
    );

    if (rolesToCreate.length > 0) {
      await this.prisma.role.createMany({
        data: rolesToCreate.map((name) => ({ id: require('crypto').randomUUID(), updatedAt: new Date(), name })),
        skipDuplicates: true,
      });
    }

    const allRoles = await this.prisma.role.findMany({
      where: { name: { in: uniqueNames } },
    });

    const roleIdByName = new Map(allRoles.map((role) => [role.name, role.id]));

    const existingUserRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const desiredNames = new Set(uniqueNames);

    const userRoleIdsToDelete = existingUserRoles
      .filter((ur) => (ur as any).role && !desiredNames.has((ur as any).role.name))
      .map((ur) => ur.id);

    if (userRoleIdsToDelete.length > 0) {
      await this.prisma.userRole.deleteMany({
        where: { id: { in: userRoleIdsToDelete } },
      });
    }

    const existingUserRoleNames = new Set(
      existingUserRoles.filter((ur) => (ur as any).role).map((ur) => (ur as any).role.name),
    );

    const userRolesToAdd = uniqueNames.filter(
      (name) => !existingUserRoleNames.has(name),
    );

    if (userRolesToAdd.length > 0) {
      await this.prisma.userRole.createMany({
        data: userRolesToAdd.map((name) => ({
          id: require('crypto').randomUUID(),
          userId,
          roleId: roleIdByName.get(name)!,
        })),
        skipDuplicates: true,
      });
    }

    return uniqueNames;
  }

  async findByAzureOid(azureOid: string): Promise<any> {
    return this.prisma.user.findUnique({ where: { adGuid: azureOid } });
  }

  async create(userData: any): Promise<any> {
    return this.prisma.user.create({ data: userData });
  }

  async createFromAd(adUser: any): Promise<any> {
    return this.prisma.user.create({
      data: {
        id: require('crypto').randomUUID(),
        updatedAt: new Date(),
        username: adUser.sAMAccountName,
        email: adUser.mail || `${adUser.sAMAccountName}@example.com`,
        password: "",
        firstName: adUser.displayName || adUser.sAMAccountName,
        adGuid: adUser.objectGUID,
        adDN: adUser.dn,
        adUsername: adUser.sAMAccountName,
        adGroups: adUser.memberOf
          ? Array.isArray(adUser.memberOf)
            ? adUser.memberOf
            : [adUser.memberOf]
          : [],
        lastAdSync: new Date(),
        status: "ACTIVE",
      },
    });
  }

  async findAll(options: { search?: string; limit?: number } = {}): Promise<any[]> {
    const { search, limit } = options;
    const trimmedSearch = search?.trim();

    return this.prisma.user.findMany({
      where: trimmedSearch
        ? {
            OR: [
              { firstName: { contains: trimmedSearch, mode: "insensitive" } },
              { lastName: { contains: trimmedSearch, mode: "insensitive" } },
              { email: { contains: trimmedSearch, mode: "insensitive" } },
              { username: { contains: trimmedSearch, mode: "insensitive" } },
              { jobTitle: { contains: trimmedSearch, mode: "insensitive" } },
              { position: { contains: trimmedSearch, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: limit ? Math.min(Math.max(limit, 1), 50) : undefined,
    });
  }

  async findOne(usernameOrEmail: string): Promise<any> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: usernameOrEmail, mode: "insensitive" } },
          { email: { equals: usernameOrEmail, mode: "insensitive" } },
        ],
      },
    });
  }

  async findById(id: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async update(id: string, updateData: any): Promise<any> {
    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async updateFromAd(userId: string, adUser: any): Promise<any> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: adUser.mail || undefined,
        firstName: adUser.displayName || undefined,
        adGuid: adUser.objectGUID,
        adDN: adUser.dn,
        adUsername: adUser.sAMAccountName,
        adGroups: adUser.memberOf
          ? Array.isArray(adUser.memberOf)
            ? adUser.memberOf
            : [adUser.memberOf]
          : [],
        lastAdSync: new Date(),
        status: "ACTIVE",
      },
    });
  }

  async findExecutives(): Promise<any[]> {
    // Fetch users with executive titles from the database
    // Broadened search to include Directors, Managers, Chiefs, and known executives
    const executives = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              // Specific titles
              { jobTitle: { contains: 'Executive', mode: 'insensitive' } },
              { jobTitle: { contains: 'Statistician General', mode: 'insensitive' } },
              { jobTitle: { contains: 'Director', mode: 'insensitive' } },
              { jobTitle: { contains: 'Chief', mode: 'insensitive' } },
              { jobTitle: { contains: 'Manager', mode: 'insensitive' } },
              { jobTitle: { contains: 'Head', mode: 'insensitive' } },
              { position: { contains: 'Executive', mode: 'insensitive' } },
              { position: { contains: 'Statistician General', mode: 'insensitive' } },
              { position: { contains: 'Director', mode: 'insensitive' } },
              { position: { contains: 'Chief', mode: 'insensitive' } },
              { position: { contains: 'Manager', mode: 'insensitive' } },
              { position: { contains: 'Head', mode: 'insensitive' } },
              // Known executives by email
              { email: 'LMareka@nsa.org.na' },
            ],
          },
          { status: 'ACTIVE' },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        position: true,
        profilePictureUrl: true,
      },
      orderBy: [
        { jobTitle: 'asc' },
        { lastName: 'asc' },
      ],
      take: 10, // Limit to top 10 executives
    });

    console.log(`[EXECUTIVES] Found ${executives.length} executives`);
    
    return executives.map(exec => ({
      id: exec.id,
      name: `${exec.firstName || ''} ${exec.lastName || ''}`.trim(),
      position: exec.jobTitle || exec.position || 'Executive',
      image: exec.profilePictureUrl || `/api/placeholder-avatar?name=${encodeURIComponent(exec.firstName || '')}`,
      email: exec.email,
    }));
  }

  async remove(id: string): Promise<any> {
    return this.prisma.user.delete({ where: { id } });
  }

  async findByEmail(email: string): Promise<any> {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async findAllActiveWithAdGuid(): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { status: "ACTIVE", adGuid: { not: null } },
      select: { id: true, email: true, adGuid: true, managerId: true }
    });
  }
}

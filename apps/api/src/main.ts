import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as dotenv from "dotenv";
import * as path from "path";
import winston from "winston";
import * as dns from "dns";
import { ConfigService } from "@nestjs/config";

// Ensure Node prefers IPv4 over IPv6 when resolving DNS (avoids
// "No route to host" issues in environments without IPv6 routing).
// Must run before any outbound HTTP requests (e.g. JWKS, Graph).
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

function expandAllowedOrigins(origins: string[]): string[] {
  const expandedOrigins = new Set<string>();

  for (const origin of origins) {
    const trimmedOrigin = origin.trim();
    if (!trimmedOrigin) {
      continue;
    }

    expandedOrigins.add(trimmedOrigin);

    try {
      const parsedOrigin = new URL(trimmedOrigin);
      if (
        parsedOrigin.hostname === "localhost" ||
        parsedOrigin.hostname === "127.0.0.1"
      ) {
        for (const loopbackHost of ["localhost", "127.0.0.1"]) {
          const variantOrigin = new URL(trimmedOrigin);
          variantOrigin.hostname = loopbackHost;
          expandedOrigins.add(variantOrigin.origin);
        }
      }
    } catch {
      // Keep the original configured value if it is not a valid URL.
    }
  }

  return Array.from(expandedOrigins);
}

async function bootstrap() {
  const generatedMemosDir = process.env.MEMO_STORAGE_DIR
    ? path.resolve(process.env.MEMO_STORAGE_DIR)
    : path.resolve(__dirname, "../public/generated_memos");

  // ────────────────────────────────────────────────
  // Early environment loading (development only)
  // ────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const envPath = path.resolve(__dirname, "../../../.env");
    const result = dotenv.config({
      path: envPath,
      override: true,
    });

    if (result.error) {
      Logger.warn(
        `Failed to load monorepo root .env file: ${result.error.message}`,
      );
    } else if (result.parsed) {
      // Keep this as a low-noise debug message; dotenv already logs helpful output when debug enabled
      Logger.debug(`Loaded environment variables from ${envPath}`);
    }
  }

  // Import AppModule dynamically *after* dotenv runs so packages that access
  // process.env during module initialization see the env vars.
  const { AppModule } = await import("./app.module");

  // ────────────────────────────────────────────────
  // Create Nest application
  // ────────────────────────────────────────────────
  // Create a Winston logger instance and make it compatible with Nest's logger usage
  // Define custom colors for log levels
  winston.addColors({
    error: "red bold",
    warn: "yellow",
    info: "cyan",
    debug: "gray",
    verbose: "magenta",
  });

  // Custom format for development: colorized, readable, with proper spacing
  const devFormat = winston.format.combine(
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ level, message, timestamp, context, trace }) => {
      const ctx = context ? `\x1b[33m[${context}]\x1b[0m` : "";
      const msg: string =
        typeof message === "object"
          ? JSON.stringify(message, null, 2)
          : String(message ?? "");

      // Add visual separators for important events
      if (
        msg.includes("Application is running") ||
        msg.includes("successfully started")
      ) {
        return `\n${"─".repeat(
          60,
        )}\n${timestamp} ${level} ${ctx} ${msg}\n${"─".repeat(60)}\n`;
      }
      if (msg?.includes("Mapped {")) {
        // Compact route mapping logs
        const route = msg.match(/\{([^}]+)\}/)?.[1] || msg;
        return `  ${level} ${ctx} → ${route}`;
      }
      if (msg?.includes("Controller")) {
        return `\n${timestamp} ${level} ${ctx} ${msg}`;
      }

      const stackTrace = trace ? `\n${trace}` : "";
      return `${timestamp} ${level} ${ctx} ${msg}${stackTrace}`;
    }),
  );

  const winstonLogger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format:
          process.env.NODE_ENV === "production"
            ? winston.format.json()
            : devFormat,
      }),
      // Add file logging in production
      ...(process.env.NODE_ENV === "production"
        ? [
            new winston.transports.File({
              filename: "logs/error.log",
              level: "error",
            }),
            new winston.transports.File({
              filename: "logs/combined.log",
            }),
          ]
        : []),
    ],
  });

  // Provide a Nest-compatible logger adapter that delegates to Winston.
  const nestLoggerAdapter = {
    log: (message: any, context?: string) =>
      winstonLogger.info(message, context ? { context } : undefined),
    error: (message: any, trace?: string, context?: string) =>
      winstonLogger.error(
        message,
        Object.assign({ trace }, context ? { context } : {}),
      ),
    warn: (message: any, context?: string) =>
      winstonLogger.warn(message, context ? { context } : undefined),
    debug: (message: any, context?: string) =>
      winstonLogger.debug(message, context ? { context } : undefined),
    verbose: (message: any, context?: string) =>
      winstonLogger.verbose(message, context ? { context } : undefined),
  };

  const app = await NestFactory.create(AppModule, {
    logger: nestLoggerAdapter as any,
  });

  const configService = app.get(ConfigService);

  // ────────────────────────────────────────────────
  // CORS - MUST be enabled FIRST before other middleware
  // ────────────────────────────────────────────────
  const corsOrigin =
    configService.get<string>("CORS_ORIGIN") || "http://localhost:3080";
  const allowedOrigins = expandAllowedOrigins(
    corsOrigin.split(",").map((o) => o.trim()),
  );

  // Log CORS configuration for debugging
  Logger.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        Logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS policy"));
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ────────────────────────────────────────────────
  // Cookie parser - required for session cookies
  // ────────────────────────────────────────────────
  const cookieParser = await import("cookie-parser");
  app.use(cookieParser.default());

  // ────────────────────────────────────────────────
  // Global pipes, security, rate limiting
  // ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Helmet with CORS-friendly settings
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }),
  );

  // Rate limiting - exclude OPTIONS preflight and auth endpoints
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // Increased limit for development - each IP gets 500 requests per window
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Don't rate limit preflight requests
        if (req.method === "OPTIONS") return true;
        // Don't rate limit auth endpoints to prevent login issues
        if (req.path?.startsWith("/api/auth")) return true;
        return false;
      },
    }),
  );

  // ────────────────────────────────────────────────
  // Static file serving for generated memos
  // ────────────────────────────────────────────────
  const express = await import("express");
  app.use(
    "/generated_memos",
    express.default.static(generatedMemosDir),
  );

  // ────────────────────────────────────────────────
  // Global API prefix - all routes prefixed with /api
  // ────────────────────────────────────────────────
  app.setGlobalPrefix("api");

  // ────────────────────────────────────────────────
  // Swagger / API docs (only in non-production)
  // ────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    try {
      const { DocumentBuilder, SwaggerModule } = await import(
        "@nestjs/swagger"
      );
      const config = new DocumentBuilder()
        .setTitle("MyNSA Desk API")
        .setDescription(
          "Backend API for the MyNSA Desk internal workplace system",
        )
        .setVersion("1.0")
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup("api", app, document, {
        swaggerOptions: { persistAuthorization: true },
      });
    } catch (err) {
      Logger.warn(
        "@nestjs/swagger is not installed or incompatible; skipping Swagger setup",
      );
    }
  }

  // ────────────────────────────────────────────────
  // Start server
  // ────────────────────────────────────────────────
  const port =
    configService.get<number>("API_PORT") ||
    configService.get<number>("PORT") ||
    34567;
  await app.listen(port, "0.0.0.0");

  // Clear startup banner
  console.log("\n");
  console.log("\x1b[36m" + "═".repeat(60) + "\x1b[0m");
  console.log("\x1b[36m  🚀 MyNSA Desk API Server\x1b[0m");
  console.log("\x1b[36m" + "═".repeat(60) + "\x1b[0m");
  console.log(`\x1b[32m  ✓ Server:    \x1b[0mhttp://localhost:${port}`);
  console.log(
    `\x1b[32m  ✓ Health:    \x1b[0mhttp://localhost:${port}/api/health`,
  );
  if (process.env.NODE_ENV !== "production") {
    console.log(`\x1b[32m  ✓ API Docs:  \x1b[0mhttp://localhost:${port}/api`);
  }
  console.log(
    `\x1b[32m  ✓ Mode:      \x1b[0m${process.env.NODE_ENV || "development"}`,
  );
  console.log("\x1b[36m" + "═".repeat(60) + "\x1b[0m");
  console.log("\n");

  // ────────────────────────────────────────────────
  // Graceful shutdown handling
  // ────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(
      `\n\x1b[33m⚡ Received ${signal}, shutting down gracefully...\x1b[0m`,
    );
    try {
      await app.close();
      console.log("\x1b[32m✓ Server closed successfully\x1b[0m\n");
      process.exit(0);
    } catch (err) {
      console.error("\x1b[31m✗ Error during shutdown:\x1b[0m", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  Logger.error("Bootstrap failed", err);
  process.exit(1);
});

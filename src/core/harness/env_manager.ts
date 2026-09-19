import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface EnvGenResult {
  envExamplePath: string;
  envPath: string;
  keysAdded: string[];
  systemMessages: string[];
}

export class EnvManager {
  static generateEnvTemplates(
    projectRoot: string = process.cwd(),
    requiredBackends: string[] = []
  ): EnvGenResult {
    const systemMessages: string[] = [];
    const keys: { key: string; comment: string; defaultValue: string }[] = [];

    if (!existsSync(projectRoot)) {
      mkdirSync(projectRoot, { recursive: true });
    }

    // Core app environment variables
    keys.push({
      key: "APP_ENV",
      comment: "Application environment mode (development, staging, production)",
      defaultValue: "development",
    });

    // Detect Cloudflare
    if (
      requiredBackends.includes("Cloudflare Workers") ||
      existsSync(join(projectRoot, "wrangler.toml"))
    ) {
      keys.push({
        key: "CLOUDFLARE_WORKER_URL",
        comment: "Cloudflare Worker signaling / API endpoint URL",
        defaultValue: "https://p2p-signaling.your-subdomain.workers.dev",
      });
      keys.push({
        key: "CLOUDFLARE_API_TOKEN",
        comment: "Cloudflare API token for worker deployments",
        defaultValue: "your_cloudflare_api_token_here",
      });
    }

    // Detect Supabase
    if (requiredBackends.includes("Supabase")) {
      keys.push({
        key: "SUPABASE_URL",
        comment: "Supabase project URL",
        defaultValue: "https://your-project.supabase.co",
      });
      keys.push({
        key: "SUPABASE_ANON_KEY",
        comment: "Supabase anonymous API key",
        defaultValue: "your_supabase_anon_key_here",
      });
    }

    // Detect Firebase
    if (requiredBackends.includes("Firebase")) {
      keys.push({
        key: "FIREBASE_PROJECT_ID",
        comment: "Firebase project ID",
        defaultValue: "your-firebase-project-id",
      });
      keys.push({
        key: "FIREBASE_API_KEY",
        comment: "Firebase web API key",
        defaultValue: "your_firebase_api_key_here",
      });
    }

    // Detect Neon Postgres
    if (requiredBackends.includes("Neon Postgres")) {
      keys.push({
        key: "DATABASE_URL",
        comment: "Neon Postgres connection string",
        defaultValue: "postgres://user:password@ep-cool-endpoint.neon.tech/neondb?sslmode=require",
      });
    }

    // Detect WebRTC / STUN / TURN
    if (requiredBackends.includes("WebRTC STUN/TURN") || true) {
      keys.push({
        key: "STUN_SERVER_URL",
        comment: "WebRTC STUN server URL for P2P NAT traversal",
        defaultValue: "stun:stun.l.google.com:19302",
      });
      keys.push({
        key: "TURN_SERVER_URL",
        comment: "WebRTC TURN relay server URL (optional for strict NATs)",
        defaultValue: "turn:turn.example.com:3478",
      });
      keys.push({
        key: "TURN_SERVER_CREDENTIAL",
        comment: "TURN relay server authentication token",
        defaultValue: "your_turn_credential_here",
      });
    }

    const exampleLines: string[] = [
      "# ===========================================================================",
      "# OPEN HARNESS // AUTONOMOUS BACKEND & CLOUD ENVIRONMENT TEMPLATE",
      "# Populate required API keys & credentials for your deployment",
      "# ===========================================================================",
      "",
    ];

    const envLines: string[] = [...exampleLines];

    for (const item of keys) {
      exampleLines.push(`# ${item.comment}`);
      exampleLines.push(`${item.key}=${item.defaultValue}`);
      exampleLines.push("");

      envLines.push(`# ${item.comment}`);
      envLines.push(`${item.key}=${item.defaultValue}`);
      envLines.push("");
    }

    const envExamplePath = join(projectRoot, ".env.example");
    const envPath = join(projectRoot, ".env");

    try {
      writeFileSync(envExamplePath, exampleLines.join("\n"), "utf-8");
      systemMessages.push(`[SYSTEM] Generated backend environment template at ".env.example".`);

      if (!existsSync(envPath)) {
        writeFileSync(envPath, envLines.join("\n"), "utf-8");
        systemMessages.push(`[SYSTEM] Created initial ".env" file for local environment configuration.`);
      }
    } catch (e: any) {
      systemMessages.push(`[SYSTEM] Environment file generation warning: ${e.message}`);
    }

    return {
      envExamplePath,
      envPath,
      keysAdded: keys.map((k) => k.key),
      systemMessages,
    };
  }
}

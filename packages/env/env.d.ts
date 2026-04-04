// Type definitions for Cloudflare Workers environment bindings.
// These are manually declared since HowlBoard does not use Alchemy.

declare module "cloudflare:workers" {
  namespace Cloudflare {
    export interface Env {
      // D1 Database
      DB: D1Database;

      // R2 Bucket for drawings/assets
      DRAWINGS_BUCKET: R2Bucket;

      // KV for caching
      CACHE: KVNamespace;

      // Better Auth
      BETTER_AUTH_SECRET: string;
      BETTER_AUTH_URL: string;

      // CORS
      CORS_ORIGIN: string;
    }
  }
}

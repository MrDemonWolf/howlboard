import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@howlboard/api/context";
import { appRouter } from "@howlboard/api/routers/index";
import { auth } from "@howlboard/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

type Bindings = {
  CORS_ORIGIN?: string;
  DRAWINGS_BUCKET?: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-isolate)
// Cloudflare Workers spin up fresh isolates, so this Map is short-lived and
// acts as a best-effort per-instance limiter. For stricter enforcement across
// instances, use Cloudflare KV or Durable Objects.
// ---------------------------------------------------------------------------
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(ip: string, bucket: string): string {
  return `${bucket}:${ip}`;
}

function isRateLimited(
  ip: string,
  bucket: string,
  maxRequests: number,
  windowMs: number,
): { limited: boolean; remaining: number; resetAt: number } {
  const key = getRateLimitKey(ip, bucket);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Lazy cleanup: prune expired entries when map grows large
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore) {
      if (now >= v.resetAt) rateLimitStore.delete(k);
    }
  }

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { limited: false, remaining: maxRequests - 1, resetAt };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    limited: false,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use("/*", async (c, next) => {
  await next();
  c.res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("X-XSS-Protection", "1; mode=block");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
});

app.use(logger());
app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env?.CORS_ORIGIN || "http://localhost:3001";
      return origin === allowed ? origin : null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ---------------------------------------------------------------------------
// Rate-limiting middleware: auth endpoints (5 req/min) & general API (60 req/min)
// ---------------------------------------------------------------------------
app.use("/api/auth/*", async (c, next) => {
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const { limited, remaining, resetAt } = isRateLimited(
    ip,
    "auth",
    5,
    60_000,
  );

  c.res.headers.set("X-RateLimit-Limit", "5");
  c.res.headers.set("X-RateLimit-Remaining", String(remaining));
  c.res.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

  if (limited) {
    return c.json({ error: "Too many requests. Please try again later." }, 429);
  }
  await next();
});

app.use("/trpc/*", async (c, next) => {
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const { limited, remaining, resetAt } = isRateLimited(
    ip,
    "api",
    60,
    60_000,
  );

  c.res.headers.set("X-RateLimit-Limit", "60");
  c.res.headers.set("X-RateLimit-Remaining", String(remaining));
  c.res.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

  if (limited) {
    return c.json({ error: "Too many requests. Please try again later." }, 429);
  }
  await next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => {
  return c.text("HowlBoard API");
});

export default app;

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

// Security headers
app.use("/*", async (c, next) => {
  await next();
  c.res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  c.res.headers.set("X-Content-Type-Options", "nosniff");
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

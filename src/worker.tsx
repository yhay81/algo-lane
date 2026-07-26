import { Hono } from "hono";
import { requestId } from "hono/request-id";

import { securityHeaders } from "./middleware/security";
import { HomePage, NotFoundPage, PrivacyPage } from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
  WRITE_LIMITER: RateLimit;
};

const app = new Hono<{ Bindings: Bindings }>();
const eventNames = new Set([
  "visited",
  "lane_generated",
  "history_imported",
  "problem_opened",
  "solved_marked",
  "exported",
  "returned",
]);
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

app.use("*", requestId());
app.use("*", securityHeaders);

async function hashValue(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

app.get("/", (c) => c.html(<HomePage />));
app.get("/privacy", (c) => c.html(<PrivacyPage />));

app.post("/api/telemetry", async (c) => {
  c.header("Cache-Control", "no-store");
  const fetchSite = c.req.header("Sec-Fetch-Site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return c.json({ error: "cross_site_request" }, 403);
  }
  const contentType = c.req.header("Content-Type") ?? "";
  const contentLength = Number(c.req.header("Content-Length") ?? "0");
  if (!contentType.toLowerCase().startsWith("application/json") || contentLength > 500) {
    return c.json({ error: "invalid_telemetry" }, 400);
  }
  const raw = await c.req.text();
  if (!raw || new TextEncoder().encode(raw).byteLength > 500) {
    return c.json({ error: "invalid_telemetry" }, 400);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return c.json({ error: "invalid_telemetry" }, 400);
  }
  if (!payload || typeof payload !== "object") {
    return c.json({ error: "invalid_telemetry" }, 400);
  }
  const fields = Object.keys(payload);
  const { name, sessionId } = payload as Record<string, unknown>;
  if (
    fields.length !== 2 ||
    !fields.includes("name") ||
    !fields.includes("sessionId") ||
    typeof name !== "string" ||
    !eventNames.has(name) ||
    typeof sessionId !== "string" ||
    !sessionIdPattern.test(sessionId)
  ) {
    return c.json({ error: "invalid_telemetry" }, 400);
  }
  const sessionHash = await hashValue(sessionId);
  const limit = await c.env.WRITE_LIMITER.limit({ key: sessionHash });
  if (!limit.success) {
    return c.json({ error: "rate_limited" }, 429);
  }
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO product_events (session_hash, name, occurred_on)
     VALUES (?, ?, date('now'))`,
  )
    .bind(sessionHash, name)
    .run();
  return c.body(null, 204);
});

app.get("/healthz", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({
    healthy: true,
    service: "algo-lane",
    time: new Date().toISOString(),
  });
});

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
  }
  return c.html(<NotFoundPage />, 404);
});

app.onError((error, c) => {
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

async function cleanup(db: D1Database) {
  await db.prepare("DELETE FROM product_events WHERE occurred_on < date('now', '-35 days')").run();
}

export { app };
export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext) {
    context.waitUntil(cleanup(env.DB));
  },
};

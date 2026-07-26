import { describe, expect, it } from "vitest";

import { app, type Bindings } from "../src/worker";

const sessionId = "313c096a-2ab6-4bda-a6bc-21361e522e99";

type RecordedStatement = {
  bindings: unknown[];
  sql: string;
};

function environment(options: { limit?: boolean } = {}) {
  const recorded: RecordedStatement[] = [];
  const db = {
    prepare(sql: string) {
      let bindings: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) {
          bindings = values;
          return statement;
        },
        run: async () => {
          recorded.push({ bindings, sql });
          return { meta: { changes: 1 }, success: true };
        },
      };
      return statement;
    },
  };
  const bindings: Bindings = {
    ASSETS: {
      fetch: () => Promise.resolve(new Response("not used")),
    } as unknown as Fetcher,
    DB: db as unknown as D1Database,
    WRITE_LIMITER: {
      limit: () => Promise.resolve({ success: options.limit !== false }),
    },
  };
  return { bindings, recorded };
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("worker", () => {
  it("renders the compact five-problem workbench without experiment copy", async () => {
    const { bindings } = environment();
    const response = await app.request("/", undefined, bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("content-security-policy")).toContain(
      "connect-src 'self' https://kenkoooo.com",
    );
    expect(html).toContain('lang="ja"');
    expect(html).toContain('class="algo-workbench"');
    expect(html).toContain('id="problem-lane"');
    expect(html).toContain('id="rating-bands"');
    expect(html).toContain('id="activity-grid"');
    expect(html).toContain("進捗と設定は端末内だけ");
    expect(html).not.toContain('class="hero"');
    expect(html).not.toContain("仮説");
    expect(html).not.toContain("成功条件");
    expect(html).not.toContain("PUBLIC VALIDATION");
  });

  it("stores only a hash and event name for valid anonymous telemetry", async () => {
    const { bindings, recorded } = environment();
    const response = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ name: "lane_generated", sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      bindings,
    );

    expect(response.status).toBe(204);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.sql).toContain("INSERT OR IGNORE INTO product_events");
    expect(recorded[0]?.bindings).toEqual([await hash(sessionId), "lane_generated"]);
    expect(recorded[0]?.bindings).not.toContain(sessionId);
  });

  it("rejects extra fields so identifiers and problem data cannot enter telemetry", async () => {
    const { bindings, recorded } = environment();
    const response = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({
          atcoderId: "private_user",
          name: "history_imported",
          sessionId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      bindings,
    );

    expect(response.status).toBe(400);
    expect(recorded).toHaveLength(0);
  });

  it("rejects cross-site, unknown, oversized, and rate-limited telemetry", async () => {
    const { bindings, recorded } = environment();
    const crossSite = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ name: "visited", sessionId }),
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" },
        method: "POST",
      },
      bindings,
    );
    const unknown = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ name: "problem_id", sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      bindings,
    );
    const tooLarge = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ name: "visited", padding: "x".repeat(600), sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      bindings,
    );
    const limitedEnvironment = environment({ limit: false });
    const limited = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ name: "visited", sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      limitedEnvironment.bindings,
    );

    expect(crossSite.status).toBe(403);
    expect(unknown.status).toBe(400);
    expect(tooLarge.status).toBe(400);
    expect(limited.status).toBe(429);
    expect(recorded).toHaveLength(0);
    expect(limitedEnvironment.recorded).toHaveLength(0);
  });

  it("serves the privacy boundary, health endpoint, and HTML not-found page", async () => {
    const { bindings } = environment();
    const privacy = await app.request("/privacy", undefined, bindings);
    const privacyHtml = await privacy.text();
    const health = await app.request("/healthz", undefined, bindings);
    const missing = await app.request("/missing", undefined, bindings);

    expect(privacy.status).toBe(200);
    expect(privacyHtml).toContain("練習状態は、この端末の中で扱います");
    expect(health.status).toBe(200);
    expect(health.headers.get("cache-control")).toBe("no-store");
    expect((await health.json<{ healthy: boolean }>()).healthy).toBe(true);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("ページが見つかりません");
  });
});

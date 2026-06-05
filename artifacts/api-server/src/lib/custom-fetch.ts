/**
 * custom-fetch — drop-in fetch replacement that resolves hostnames via
 * Google/Cloudflare DNS (8.8.8.8 / 1.1.1.1) instead of the OS resolver.
 *
 * Required in Replit's production environment where the default resolver
 * fails to look up .ng TLD domains (ENOTFOUND vtpass.com.ng).
 */
import dns from "node:dns";
import https from "node:https";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const AGENT = new https.Agent({
  keepAlive: true,
  lookup: (hostname, _opts, cb) => {
    dns.resolve4(hostname, (err, addrs) => {
      if (err || !addrs?.length) {
        dns.lookup(hostname, { family: 4 }, cb);
      } else {
        cb(null, addrs[0], 4);
      }
    });
  },
});

export async function customFetch(
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  } = {},
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port ? Number(u.port) : 443,
        path: u.pathname + u.search,
        method: (init.method ?? "GET").toUpperCase(),
        headers: init.headers ?? {},
        agent: AGENT,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 200;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(JSON.parse(text)),
          });
        });
        res.on("error", reject);
      },
    );

    req.on("error", reject);

    if (init.signal) {
      const sig = init.signal;
      if (sig.aborted) {
        req.destroy(new Error("AbortError"));
        reject(new Error("AbortError"));
        return;
      }
      sig.addEventListener("abort", () => {
        req.destroy(new Error("AbortError"));
        reject(new Error("AbortError"));
      });
    }

    if (init.body) req.write(init.body);
    req.end();
  });
}

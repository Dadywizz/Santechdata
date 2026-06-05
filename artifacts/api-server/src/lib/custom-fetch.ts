/**
 * custom-fetch — drop-in fetch replacement that resolves hostnames via
 * DNS-over-HTTPS (Cloudflare 1.1.1.1 and Google 8.8.8.8) so that .ng TLD
 * domains work in Replit's production environment where both the OS resolver
 * and UDP-based custom DNS servers fail (ENOTFOUND).
 *
 * Key trick: 1.1.1.1 and 8.8.8.8 are numeric IPs → no DNS lookup needed to
 * reach them. We then connect to the resolved IP directly while passing the
 * original hostname as SNI / Host header so TLS certs validate correctly.
 */
import https from "node:https";

const DOH_ENDPOINTS = [
  "https://1.1.1.1/dns-query",   // Cloudflare
  "https://8.8.8.8/resolve",     // Google
];

const ipCache = new Map<string, { ip: string; exp: number }>();

async function resolveViaDoH(hostname: string): Promise<string> {
  const cached = ipCache.get(hostname);
  if (cached && Date.now() < cached.exp) return cached.ip;

  for (const endpoint of DOH_ENDPOINTS) {
    try {
      const url = `${endpoint}?name=${encodeURIComponent(hostname)}&type=A`;
      const res = await fetch(url, {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json() as {
        Answer?: Array<{ type: number; data: string }>;
        Status?: number;
      };
      const ip = data.Answer?.find((r) => r.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(r.data))?.data;
      if (ip) {
        ipCache.set(hostname, { ip, exp: Date.now() + 5 * 60_000 }); // cache 5 min
        return ip;
      }
    } catch {
      // try next endpoint
    }
  }
  throw new Error(`getaddrinfo ENOTFOUND ${hostname}`);
}

const agentCache = new Map<string, https.Agent>();

function getAgent(ip: string, hostname: string): https.Agent {
  const key = `${ip}|${hostname}`;
  if (!agentCache.has(key)) {
    agentCache.set(
      key,
      new https.Agent({
        keepAlive: true,
        servername: hostname, // SNI — ensures TLS cert is validated against the real hostname
      }),
    );
  }
  return agentCache.get(key)!;
}

export async function customFetch(
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  } = {},
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  const u = new URL(url);
  const ip = await resolveViaDoH(u.hostname);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: ip,
        port: u.port ? Number(u.port) : 443,
        path: u.pathname + u.search,
        method: (init.method ?? "GET").toUpperCase(),
        headers: {
          ...(init.headers ?? {}),
          Host: u.hostname, // required when connecting via IP
        },
        agent: getAgent(ip, u.hostname),
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
            json: () => {
              try {
                return Promise.resolve(JSON.parse(text));
              } catch {
                return Promise.reject(new Error(`Invalid JSON: ${text.slice(0, 200)}`));
              }
            },
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

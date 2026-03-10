/**
 * Vite plugin: OData proxy for Data Connector during dev (avoids CORS).
 * Only active when running `npm run dev`. Production builds use Trip API fallback.
 * Maps MyGeotab server to jurisdictional Data Connector URL (403 when wrong server).
 */

import type { Plugin } from "vite";

const ODATA_PROXY_PATH = "/__odata_proxy";

/** Map MyGeotab server host to Data Connector base. 1=EU, 2=US, 3=CA, 4=AU, 5=BR, 6=AS, 7=USGov. */
function getDataConnectorBase(server: string | undefined): string {
  const host = (server ?? "").toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (host.includes("my3.")) return "https://odata-connector-1.geotab.com/odata/v4/svc";
  if (host.includes("my4.")) return "https://odata-connector-4.geotab.com/odata/v4/svc";
  if (host.includes("my5.")) return "https://odata-connector-5.geotab.com/odata/v4/svc";
  if (host.includes("my6.")) return "https://odata-connector-6.geotab.com/odata/v4/svc";
  if (host.includes("my7.")) return "https://odata-connector-7.geotab.com/odata/v4/svc";
  if (host.includes("my2.")) return "https://odata-connector-2.geotab.com/odata/v4/svc";
  return "https://odata-connector-2.geotab.com/odata/v4/svc"; // my.geotab.com default = US
}

export function odataProxy(): Plugin {
  return {
    name: "odata-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== "POST" || req.url !== ODATA_PROXY_PATH) {
          next();
          return;
        }

        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const { database, userName, password, path, server: geoServer } = JSON.parse(body);
            if (!database || !userName || !password || !path) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing database, userName, password, or path" }));
              return;
            }
            const base = getDataConnectorBase(geoServer);
            const basicAuth = Buffer.from(`${database}/${userName}:${password}`, "utf8").toString("base64");
            const url = path.startsWith("http") ? path : `${base}/${path}`;
            const proxyRes = await fetch(url, {
              method: "GET",
              headers: {
                Authorization: `Basic ${basicAuth}`,
                Accept: "application/json",
              },
            });
            const data = await proxyRes.text();
            res.writeHead(proxyRes.status, {
              "Content-Type": proxyRes.headers.get("Content-Type") || "application/json",
            });
            res.end(data);
          } catch (e) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: { message: String(e) } }));
          }
        });
      });
    },
  };
}

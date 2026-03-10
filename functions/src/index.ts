/**
 * Firebase Cloud Function: OData proxy for Geotab Data Connector.
 * Proxies OData requests to avoid CORS when the QBR dashboard runs in production (e.g. GitHub Pages).
 */

import { onRequest } from "firebase-functions/v2/https";

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

function setCorsHeaders(res: import("express").Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "86400");
}

export const odataProxy = onRequest(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { database, userName, password, path, server: geoServer } = body ?? {};

    if (!database || !userName || !password || !path) {
      res.status(400).json({ error: "Missing database, userName, password, or path" });
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
    const ct = proxyRes.headers.get("Content-Type") || "application/json";
    res.status(proxyRes.status).set("Content-Type", ct).send(data);
  } catch (e) {
    res.status(502).json({ error: { message: String(e) } });
  }
});

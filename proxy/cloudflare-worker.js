/**
 * Optional stateless Geotab API proxy for CORS.
 * Also proxies Data Connector OData when path is /odata.
 * Deploy to Cloudflare Workers. No persistence, no credential logging.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function isGeotabServer(server) {
  return server === "my.geotab.com" || server.endsWith(".geotab.com");
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "") || "/";

    // Data Connector OData proxy: POST /odata with body { database, userName, password, server, path }
    if (pathname === "/odata" || pathname.endsWith("/odata")) {
      try {
        const body = await request.json();
        const { database, userName, password, server = "my.geotab.com", path } = body;
        if (!database || !userName || !password || !path) {
          return jsonResponse({ error: { message: "Missing database, userName, password, or path" } }, 400);
        }
        if (!isGeotabServer(server)) {
          return jsonResponse({ error: { message: "Invalid server" } }, 400);
        }
        const basicAuth = btoa(`${database}/${userName}:${password}`);
        const odataUrl = `https://data-connector.geotab.com/odata/v4/svc/${path}`;
        const res = await fetch(odataUrl, {
          method: "GET",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            Accept: "application/json",
          },
        });
        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: {
            "Content-Type": res.headers.get("Content-Type") || "application/json",
            ...CORS,
          },
        });
      } catch (e) {
        return jsonResponse({ error: { message: String(e) } }, 502);
      }
    }

    // Geotab API proxy
    const target = url.searchParams.get("server") || "my.geotab.com";
    const apiUrl = `https://${target}/apiv1`;

    try {
      const body = await request.json();
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          ...CORS,
        },
      });
    } catch (e) {
      return jsonResponse({ error: { message: String(e) } }, 502);
    }
  },
};

# Optional Geotab Proxy

Stateless proxy for Geotab API and Data Connector OData. **Not required** — the dashboard uses direct Data Connector fetch by default. Use this proxy only if direct fetch fails (e.g. CORS) and you have a deployment target that supports Workers.

- **No persistence**: Does not store credentials or log request bodies.

## Routes

1. **Geotab API** (POST): Forwards to `my.geotab.com/apiv1`.
2. **Data Connector OData** (POST `/odata`): Proxies OData with Basic Auth. Optional fallback when direct fetch is blocked.

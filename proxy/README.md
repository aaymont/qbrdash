# Optional Geotab API Proxy

If direct browser calls to Geotab API are blocked by CORS, deploy this stateless proxy.

- **Cloudflare Worker**: Use `proxy/cloudflare-worker.js`. Deploy via `wrangler deploy`.
- **No persistence**: Proxy does not store credentials or log request bodies.
- **Usage**: Set `VITE_PROXY_URL` to the proxy URL. The mg-api-js layer would need to be updated to route through the proxy when this env is set.

For most Geotab deployments, direct API calls from the browser work; this proxy is optional.

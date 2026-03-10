# Geotab QBR Insights Dashboard

Production-quality v1 QBR (Quarterly Business Review) dashboard for Geotab fleet data. A static single-page web app that authenticates directly against MyGeotab and displays utilization, safety, optimization, and maintenance insights.

## Features

- **Browser-only**: No server database. Persistence via IndexedDB (Dexie) and sessionStorage only.
- **MyGeotab Auth**: Authenticate with server, database, username, password. Session token stored in sessionStorage (cleared when tab closes). Password is never stored.
- **Client Registry**: Save server/database/friendly name in localStorage for quick selection.
- **Date Windows**: 7, 14, 30, 90 days or custom range.
- **MultiCall & Chunking**: Batched API calls, chunked by day/week. Exponential backoff on rate limits.
- **Local Cache**: 12-hour TTL (configurable). Clear cache globally or per client.
- **QBR-Ready Tabs**: Utilization, Safety, Optimization, Maintenance—each with KPIs, charts, drilldown table, detail drawer, and Insights & Actions panel.
- **Print QBR Summary**: PDF-ready print view for screen share or export.

## Tech Stack

- React + Vite + TypeScript
- MUI (Material UI)
- Recharts
- Dexie (IndexedDB)
- mg-api-js (Geotab API client)

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

For GitHub Pages (repo-based site):

```bash
GITHUB_PAGES=1 npm run build
```

## Deployment (GitHub Pages)

1. Enable GitHub Pages in repo settings (Actions or branch).
2. Push to `main`. The `.github/workflows/deploy.yml` builds and deploys.
3. If your repo is `username/qbrdash`, the site will be at `https://username.github.io/qbrdash/`.
4. Ensure `vite.config.ts` base path matches your repo name (default: `/qbrdash/`).

## Security Notes

- **Never store Geotab password**. Only session token in sessionStorage.
- **Client registry** stores server, database, friendly name (not secrets).
- **IndexedDB** caches aggregated data, not credentials.
- Use "Forget session" to clear the session; "Clear local cache" to clear IndexedDB.

## CORS

Direct browser calls to MyGeotab API typically work. If CORS blocks your deployment, use the optional proxy in `/proxy` (Cloudflare Worker). Set `VITE_PROXY_URL` and configure the API layer to route through it.

## Data Connector (optional)

For more accurate utilization KPIs (driving time, idle time), the dashboard uses the Geotab Data Connector when possible. **No proxy or external services required** — it fetches directly from `data-connector.geotab.com` with your credentials.

1. Enable the Data Connector add-in: Administration → Add-Ins → add `https://app.geotab.com/addins/geotab/dataConnector/manifest.json`
2. New databases may need 2–3 hours for KPI tables to backfill
3. If Data Connector is unavailable (CORS, etc.), the app falls back to the Trip API automatically

## Data Model (v1)

- **Utilization**: Data Connector VehicleKpi (preferred) or Trip API → distance, driving/idle/stop durations, after-hours, SpeedRange1/2/3.
- **Safety**: Rule search (e.g. %Harsh%, %Speeding%) → ExceptionEvents. Fallback: Trip SpeedRange proxy.
- **Maintenance**: FaultData for date range + last 7 days "recent faults" tile.

## License

MIT

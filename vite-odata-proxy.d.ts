/**
 * Vite plugin: OData proxy for Data Connector during dev (avoids CORS).
 * Only active when running `npm run dev`. Production builds use Trip API fallback.
 * Maps MyGeotab server to jurisdictional Data Connector URL (403 when wrong server).
 */
import type { Plugin } from "vite";
export declare function odataProxy(): Plugin;

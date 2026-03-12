import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Banner, Waiting } from "@geotab/zenith";
import { useAuth } from "@/context/AuthContext";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { loadData, getCachedDataForDisplay, clearCache, clearCacheForClient, type DataPayload, type DateWindow } from "@/features/dataService";
import { UtilizationTab } from "@/components/UtilizationTab";
import { SafetyTab } from "@/components/SafetyTab";
import { OptimizationTab } from "@/components/OptimizationTab";
import { MaintenanceTab } from "@/components/MaintenanceTab";
import { PrintView } from "@/components/PrintView";

const STALE_DAYS = 7;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const zenith = {
  spacing: "var(--zenith-spacing-md, 16px)",
  spacingLg: "var(--zenith-spacing-lg, 24px)",
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral500: "var(--zenith-neutral-500, #605E5C)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  primary: "var(--zenith-primary, #0078D4)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
};

export function DashboardPage() {
  const { api, client, credentials, logout } = useAuth();
  const { unit, setUnit } = useDistanceUnit();
  const [data, setData] = useState<DataPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [progressVal, setProgressVal] = useState({ current: 0, total: 1 });
  const [tab, setTab] = useState(0);
  const [windowPreset, setWindowPreset] = useState<number>(7);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [cachedUntil, setCachedUntil] = useState<number | null>(null);
  const [ttlHours] = useState(12);
  const server = client?.server ?? "";
  const database = client?.database ?? "";

  const getWindow = useCallback((): DateWindow => {
    if (windowPreset === -1 && customFrom && customTo) {
      return {
        type: "custom",
        from: new Date(customFrom),
        to: new Date(customTo),
      };
    }
    const preset = PRESETS.find((p) => p.days === windowPreset) ?? PRESETS[0];
    return { type: "preset", days: preset.days };
  }, [windowPreset, customFrom, customTo]);

  const dateRange = useCallback(() => {
    const w = getWindow();
    if (w.type === "custom" && w.from && w.to) return { from: w.from, to: w.to };
    const days = w.days ?? 7;
    const to = new Date();
    to.setDate(to.getDate() - 1);
    to.setHours(23, 59, 59, 999);
    const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - days + 1, 0, 0, 0, 0);
    return { from, to };
  }, [getWindow]);

  const getProgressPercent = useCallback((phase: string, current: number, total: number) => {
    const t = total > 0 ? current / total : 0;
    if (phase.startsWith("odata")) return 10 + t * 35;
    if (phase === "devices") return 5;
    if (phase === "trips") return 10 + t * 35;
    if (phase === "safety") return 45 + t * 35;
    if (phase === "faults") return 80 + t * 20;
    return 5 + t * 90;
  }, []);

  const refresh = useCallback(async () => {
    if (!api || !server || !database) return;
    setLoading(true);
    setProgress("Connecting...");
    setProgressVal({ current: 0, total: 1 });
    try {
      const payload = await loadData(
        api,
        server,
        database,
        getWindow(),
        ttlHours * 60 * 60 * 1000,
        (phase, current, total) => {
          setProgress(phase);
          setProgressVal({ current, total });
        },
        credentials ? { credentials } : undefined
      );
      setData(payload);
      setLastRefreshed(Date.now());
      setCachedUntil(payload.expiresAt);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [api, server, database, credentials, getWindow, ttlHours]);

  const handleClearCache = useCallback(async () => {
    await clearCache();
    setData(null);
    setLastRefreshed(null);
    setCachedUntil(null);
  }, []);

  const handleClearClientCache = useCallback(async () => {
    if (!server || !database) return;
    await clearCacheForClient(server, database);
    setData(null);
    setLastRefreshed(null);
    setCachedUntil(null);
  }, [server, database]);

  useEffect(() => {
    if (!server || !database) return;
    getCachedDataForDisplay(server, database, getWindow()).then((payload) => {
      if (payload) {
        setData(payload);
        setLastRefreshed(payload.cachedAt);
        setCachedUntil(payload.expiresAt);
      } else {
        setData(null);
        setLastRefreshed(null);
        setCachedUntil(null);
      }
    });
  }, [server, database, getWindow]);

  const isDataStale = data != null && data.cachedAt != null && Date.now() - data.cachedAt > STALE_MS;

  if (!api || !client) {
    return null;
  }

  const TAB_LABELS = ["Utilization", "Safety", "Optimization", "Maintenance"];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: zenith.neutral100, fontFamily: zenith.fontFamily }}>
      {isDataStale && (
        <Banner
          type="warning"
          action={{ text: "Refresh", onClick: refresh }}
        >
          Data is more than {STALE_DAYS} days old. Refresh for the latest.
        </Banner>
      )}
      <header
        style={{
          backgroundColor: zenith.primary,
          color: "white",
          padding: `${zenith.spacing} ${zenith.spacingLg}`,
          display: "flex",
          alignItems: "center",
          gap: zenith.spacing,
          flexWrap: "wrap",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ flex: 1, margin: 0, fontSize: "18px", fontWeight: 600 }}>
          Geotab QBR Insights — {client.friendlyName}
          {typeof __APP_VERSION__ !== "undefined" && (
            <span style={{ marginLeft: 4, fontSize: "0.75em", opacity: 0.85 }}>
              v{__APP_VERSION__}
            </span>
          )}
        </h1>

        <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 4, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setUnit("km")}
            style={{
              padding: "6px 12px",
              border: "none",
              backgroundColor: unit === "km" ? "rgba(255,255,255,0.3)" : "transparent",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: zenith.fontFamily,
            }}
          >
            km
          </button>
          <button
            type="button"
            onClick={() => setUnit("mi")}
            style={{
              padding: "6px 12px",
              border: "none",
              backgroundColor: unit === "mi" ? "rgba(255,255,255,0.3)" : "transparent",
              color: "white",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: zenith.fontFamily,
            }}
          >
            mi
          </button>
        </div>
        <div>
          <select
            value={windowPreset}
            onChange={(e) => setWindowPreset(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              fontSize: 14,
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.5)",
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              minWidth: 120,
            }}
          >
            {PRESETS.map((p) => (
              <option key={p.days} value={p.days} style={{ color: zenith.neutral900 }}>
                {p.label}
              </option>
            ))}
            <option value={-1} style={{ color: zenith.neutral900 }}>Custom</option>
          </select>
        </div>

        {windowPreset === -1 && (
          <>
            <div>
              <label style={{ display: "block", fontSize: 11, marginBottom: 2, opacity: 0.9 }}>From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  padding: 6,
                  fontSize: 14,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.5)",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "white",
                  width: 130,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, marginBottom: 2, opacity: 0.9 }}>To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  padding: 6,
                  fontSize: 14,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.5)",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "white",
                  width: 130,
                }}
              />
            </div>
          </>
        )}

        {[
          { key: "refresh", label: "Refresh", onClick: () => refresh(), disabled: loading },
        ].map(({ key, label, onClick, disabled }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
              padding: "6px 12px",
              fontSize: 14,
              fontFamily: zenith.fontFamily,
              color: "white",
              backgroundColor: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: 4,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {label}
          </button>
        ))}
        <Link
          to="/admin"
          style={{
            padding: "6px 12px",
            fontSize: 14,
            fontFamily: zenith.fontFamily,
            color: "white",
            textDecoration: "none",
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.5)",
            borderRadius: 4,
          }}
        >
          Admin
        </Link>
        {[
          { key: "logout", label: "Logout", onClick: logout },
        ].map(({ key, label, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            style={{
              padding: "6px 12px",
              fontSize: 14,
              fontFamily: zenith.fontFamily,
              color: "white",
              backgroundColor: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </header>

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            width: "100%",
            padding: zenith.spacing,
            display: "flex",
            flexDirection: "column",
            gap: zenith.spacing,
            backgroundColor: "white",
            borderBottom: `1px solid ${zenith.neutral100}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: zenith.spacing }}>
            <Waiting />
            <span style={{ fontSize: 13, color: zenith.neutral900 }}>
              {progress}
              {progressVal.total > 1 && (
                <span style={{ marginLeft: 8, color: zenith.neutral500 }}>
                  ({progressVal.current}/{progressVal.total})
                </span>
              )}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: zenith.primary }}>
              {Math.round(getProgressPercent(progress ?? "", progressVal.current, progressVal.total))}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              backgroundColor: zenith.neutral100,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{
                width: `${Math.round(getProgressPercent(progress ?? "", progressVal.current, progressVal.total))}%`,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                height: "100%",
                backgroundColor: zenith.primary,
                borderRadius: 3,
              }}
            />
          </div>
        </motion.div>
      )}

      <div
        style={{
          padding: zenith.spacing,
          display: "flex",
          gap: zenith.spacing,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
          backgroundColor: "white",
        }}
      >
        <div style={{ display: "flex", gap: zenith.spacing, alignItems: "center", flexWrap: "wrap" }}>
          {lastRefreshed && (
            <span style={{ fontSize: 12, color: zenith.neutral500 }}>
              Last refreshed: {new Date(lastRefreshed).toLocaleString()}
            </span>
          )}
          {cachedUntil && (
            <span style={{ fontSize: 12, color: zenith.neutral500 }}>
              Data cached until: {new Date(cachedUntil).toLocaleString()}
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: zenith.neutral500 }}>
          Data range: {dateRange().from.toLocaleDateString()} – {dateRange().to.toLocaleDateString()}
        </span>
      </div>

      {!data && !loading && (
        <div style={{ padding: 48, textAlign: "center" }}>
          <p style={{ color: zenith.neutral500, marginBottom: 16 }}>No data loaded. Click Refresh to fetch.</p>
          <Button type="primary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      )}

      {data && !showPrint && (
        <>
          <div
            style={{
              borderBottom: `1px solid ${zenith.neutral100}`,
              paddingLeft: zenith.spacingLg,
              backgroundColor: "white",
            }}
          >
            <div style={{ display: "flex", gap: 0 }}>
              {TAB_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => setTab(i)}
                  style={{
                    padding: "12px 20px",
                    border: "none",
                    borderBottom: tab === i ? `2px solid ${zenith.primary}` : "2px solid transparent",
                    backgroundColor: "transparent",
                    fontSize: 14,
                    fontWeight: 500,
                    color: tab === i ? zenith.primary : zenith.neutral500,
                    cursor: "pointer",
                    fontFamily: zenith.fontFamily,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: zenith.spacingLg, backgroundColor: zenith.neutral100 }}>
            <AnimatePresence mode="wait">
              {tab === 0 && (
                <motion.div
                  key="utilization"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <UtilizationTab data={data} />
                </motion.div>
              )}
              {tab === 1 && (
                <motion.div
                  key="safety"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SafetyTab data={data} />
                </motion.div>
              )}
              {tab === 2 && (
                <motion.div
                  key="optimization"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <OptimizationTab data={data} />
                </motion.div>
              )}
              {tab === 3 && (
                <motion.div
                  key="maintenance"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <MaintenanceTab data={data} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {showPrint && data && (
        <PrintView
          data={data}
          client={client.friendlyName}
          onClose={() => setShowPrint(false)}
        />
      )}

      <div style={{ padding: zenith.spacing }}>
        <Button type="tertiary" onClick={handleClearCache}>
          Clear local cache
        </Button>
        <Button type="tertiary" onClick={handleClearClientCache}>
          Clear cache for this client
        </Button>
      </div>
    </div>
  );
}

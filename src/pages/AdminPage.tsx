import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Waiting } from "@geotab/zenith";
import { zenith } from "@/lib/theme";
import { listCachedClients, clearCacheForClient, type CachedClientSummary } from "@/lib/cache/cacheHelpers";
import { listClients } from "@/lib/clientRegistry";
import { useAuth } from "@/context/AuthContext";
import { loadData } from "@/features/dataService";
import type { DateWindow } from "@/features/dataService";

const SYNC_PERIODS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminPage() {
  const navigate = useNavigate();
  const { api, client, credentials } = useAuth();
  const [clients, setClients] = useState<CachedClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [purgeBusy, setPurgeBusy] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState<string | null>(null);
  const [syncTarget, setSyncTarget] = useState<string | null>(null);
  const [syncPeriodDays, setSyncPeriodDays] = useState(7);
  const [syncPhase, setSyncPhase] = useState("");

  const getFriendlyName = useCallback((server: string, database: string) => {
    const found = listClients().find(
      (c) => c.server.toLowerCase() === server.toLowerCase() && c.database === database
    );
    return found?.friendlyName ?? `${database} @ ${server}`;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCachedClients(getFriendlyName);
      setClients(data);
    } finally {
      setLoading(false);
    }
  }, [getFriendlyName]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePurge = useCallback(
    async (c: CachedClientSummary) => {
      const key = `${c.server}|${c.database}`;
      setPurgeBusy(key);
      try {
        await clearCacheForClient(c.server, c.database);
        await load();
      } finally {
        setPurgeBusy(null);
      }
    },
    [load]
  );

  const handleForceSync = useCallback(
    async (c: CachedClientSummary) => {
      if (!api || !client || client.server !== c.server || client.database !== c.database) return;
      const key = `${c.server}|${c.database}`;
      setSyncBusy(key);
      try {
        await clearCacheForClient(c.server, c.database);
        const window: DateWindow = { type: "preset", days: syncPeriodDays };
        await loadData(
          api,
          c.server,
          c.database,
          window,
          DEFAULT_TTL_MS,
          (phase) => setSyncPhase(phase),
          credentials ? { credentials } : undefined
        );
        setSyncTarget(null);
        await load();
      } catch (err) {
        console.error(err);
      } finally {
        setSyncBusy(null);
        setSyncPhase("");
      }
    },
    [api, client, credentials, load, syncPeriodDays]
  );

  const isCurrentClient = (c: CachedClientSummary) =>
    client?.server === c.server && client?.database === c.database;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: zenith.neutral100, fontFamily: zenith.fontFamily }}>
      <header
        style={{
          backgroundColor: zenith.primary,
          color: "white",
          padding: `${zenith.spacing} ${zenith.spacingLg}`,
          display: "flex",
          alignItems: "center",
          gap: zenith.spacing,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ flex: 1, margin: 0, fontSize: "18px", fontWeight: 600 }}>Admin — Synced Clients</h1>
        <Button type="light" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </header>

      <div style={{ padding: zenith.spacingLg, maxWidth: 900 }}>
        <p style={{ fontSize: 14, color: zenith.neutral500, marginBottom: zenith.spacingLg }}>
          Clients that have been synced and their cached data. Purge clears cached data. Force sync fetches fresh data for
          the current client; select the time period first.
        </p>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: zenith.neutral500 }}>Loading…</div>
        ) : clients.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              backgroundColor: "white",
              borderRadius: 8,
              border: `1px solid ${zenith.neutral100}`,
            }}
          >
            <p style={{ color: zenith.neutral500 }}>No cached clients. Sync data from the dashboard first.</p>
          </div>
        ) : (
          <div
            style={{
              border: `1px solid ${zenith.neutral100}`,
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: "white",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: zenith.fontFamily }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: zenith.neutral700,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    Client
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: zenith.neutral700,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: zenith.neutral700,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    Entries
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: zenith.neutral700,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    Size
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: zenith.neutral700,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    Cached
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: zenith.neutral700,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    Expires
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: zenith.neutral700,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const key = `${c.server}|${c.database}`;
                  const purgeInProgress = purgeBusy === key;
                  const syncInProgress = syncBusy === key;
                  const showSyncForm = syncTarget === key && isCurrentClient(c);
                  return (
                    <tr
                      key={key}
                      style={{
                        borderBottom: `1px solid ${zenith.neutral100}`,
                        backgroundColor: isCurrentClient(c) ? "rgba(0, 120, 212, 0.04)" : undefined,
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: 14, color: zenith.neutral900 }}>
                        <div style={{ fontWeight: 500 }}>{c.friendlyName}</div>
                        <div style={{ fontSize: 11, color: zenith.neutral500 }}>
                          {c.database} @ {c.server}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            fontSize: 11,
                            borderRadius: 4,
                            fontWeight: 600,
                            backgroundColor: c.status === "fresh" ? "rgba(16, 124, 16, 0.12)" : "rgba(209, 52, 56, 0.12)",
                            color: c.status === "fresh" ? "#107C10" : "#D13438",
                          }}
                        >
                          {c.status === "fresh" ? "Fresh" : "Expired"}
                        </span>
                        {isCurrentClient(c) && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              color: zenith.primary,
                            }}
                          >
                            (current)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, color: zenith.neutral900 }}>
                        {c.entryCount}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, color: zenith.neutral900 }}>
                        {formatBytes(c.totalSizeBytes)}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: zenith.neutral500 }}>
                        {new Date(c.cachedAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: zenith.neutral500 }}>
                        {new Date(c.expiresAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                            <Button
                              type="tertiary"
                              onClick={() => handlePurge(c)}
                              disabled={purgeInProgress}
                            >
                              {purgeInProgress ? "Purging…" : "Purge"}
                            </Button>
                            {isCurrentClient(c) ? (
                              showSyncForm ? (
                                <>
                                  <select
                                    value={syncPeriodDays}
                                    onChange={(e) => setSyncPeriodDays(Number(e.target.value))}
                                    style={{
                                      padding: "6px 10px",
                                      fontSize: 13,
                                      borderRadius: 4,
                                      border: `1px solid ${zenith.neutral100}`,
                                      fontFamily: zenith.fontFamily,
                                    }}
                                  >
                                    {SYNC_PERIODS.map((p) => (
                                      <option key={p.days} value={p.days}>
                                        {p.label}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    type="primary"
                                    onClick={() => handleForceSync(c)}
                                    disabled={syncInProgress}
                                  >
                                    {syncInProgress ? "Syncing…" : "Sync"}
                                  </Button>
                                  <Button type="tertiary" onClick={() => setSyncTarget(null)}>
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="tertiary"
                                  onClick={() => setSyncTarget(key)}
                                  disabled={syncInProgress}
                                >
                                  Force sync
                                </Button>
                              )
                            ) : null}
                          </div>
                          {syncInProgress && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: zenith.neutral500 }}>
                              <Waiting />
                              <span>{syncPhase || "Fetching data…"}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

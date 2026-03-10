import { useState, useCallback } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/context/AuthContext";
import { loadData, clearCache, clearCacheForClient, type DataPayload, type DateWindow } from "@/features/dataService";
import { UtilizationTab } from "@/components/UtilizationTab";
import { SafetyTab } from "@/components/SafetyTab";
import { OptimizationTab } from "@/components/OptimizationTab";
import { MaintenanceTab } from "@/components/MaintenanceTab";
import { PrintView } from "@/components/PrintView";

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export function DashboardPage() {
  const { api, client, logout, forgetSession } = useAuth();
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
        }
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
  }, [api, server, database, getWindow, ttlHours]);

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

  if (!api || !client) {
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Geotab QBR Insights — {client.friendlyName}
          </Typography>

          <FormControl size="small" sx={{ minWidth: 140, mx: 1 }}>
            <InputLabel>Window</InputLabel>
            <Select
              value={windowPreset}
              label="Window"
              onChange={(e) => setWindowPreset(Number(e.target.value))}
            >
              {PRESETS.map((p) => (
                <MenuItem key={p.days} value={p.days}>
                  {p.label}
                </MenuItem>
              ))}
              <MenuItem value={-1}>Custom</MenuItem>
            </Select>
          </FormControl>

          {windowPreset === -1 && (
            <>
              <TextField
                size="small"
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                sx={{ width: 130, mx: 0.5 }}
              />
              <TextField
                size="small"
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                sx={{ width: 130, mx: 0.5 }}
              />
            </>
          )}

          <IconButton color="inherit" onClick={refresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button color="inherit" startIcon={<PrintIcon />} onClick={() => setShowPrint(true)}>
            Print QBR
          </Button>
          <Button color="inherit" onClick={forgetSession}>
            Forget session
          </Button>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {loading && (
        <Box sx={{ width: "100%" }}>
          <LinearProgress />
          {progress && (
            <Typography variant="caption" sx={{ px: 2, py: 0.5 }}>
              {progress} {progressVal.total > 1 ? `${progressVal.current}/${progressVal.total}` : ""}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ px: 2, py: 1, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        {lastRefreshed && (
          <Typography variant="caption" color="text.secondary">
            Last refreshed: {new Date(lastRefreshed).toLocaleString()}
          </Typography>
        )}
        {cachedUntil && (
          <Typography variant="caption" color="text.secondary">
            Data cached until: {new Date(cachedUntil).toLocaleString()}
          </Typography>
        )}
      </Box>

      {!data && !loading && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">No data loaded. Click Refresh to fetch.</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={refresh}>
            Refresh
          </Button>
        </Box>
      )}

      {data && !showPrint && (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
            <Tab label="Utilization" />
            <Tab label="Safety" />
            <Tab label="Optimization" />
            <Tab label="Maintenance" />
          </Tabs>
          <Box sx={{ p: 2 }}>
            {tab === 0 && <UtilizationTab data={data} />}
            {tab === 1 && <SafetyTab data={data} />}
            {tab === 2 && <OptimizationTab data={data} />}
            {tab === 3 && <MaintenanceTab data={data} />}
          </Box>
        </>
      )}

      {showPrint && data && (
        <PrintView
          data={data}
          client={client.friendlyName}
          onClose={() => setShowPrint(false)}
        />
      )}

      <Box sx={{ p: 2 }}>
        <Button size="small" onClick={handleClearCache}>
          Clear local cache
        </Button>
        <Button size="small" onClick={handleClearClientCache}>
          Clear cache for this client
        </Button>
      </Box>
    </Box>
  );
}

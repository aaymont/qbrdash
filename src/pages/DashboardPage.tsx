import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Alert,
} from "@mui/material";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PrintIcon from "@mui/icons-material/Print";
import LogoutIcon from "@mui/icons-material/Logout";
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

export function DashboardPage() {
  const { api, client, credentials, logout, forgetSession } = useAuth();
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
    const to = new Date();
    const days = w.days ?? 7;
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to };
  }, [getWindow]);

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
      }
    });
  }, [server, database, getWindow]);

  const isDataStale = data != null && data.cachedAt != null && Date.now() - data.cachedAt > STALE_MS;

  if (!api || !client) {
    return null;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {isDataStale && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{ borderRadius: 0 }}
          action={
            <Button color="inherit" size="small" onClick={refresh}>
              Refresh
            </Button>
          }
        >
          Data is more than {STALE_DAYS} days old. Refresh for the latest.
        </Alert>
      )}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Geotab QBR Insights — {client.friendlyName}
          </Typography>

          <ToggleButtonGroup
            value={unit}
            exclusive
            onChange={(_, v) => v && setUnit(v)}
            size="small"
            sx={{ mx: 1 }}
          >
            <ToggleButton value="km">km</ToggleButton>
            <ToggleButton value="mi">mi</ToggleButton>
          </ToggleButtonGroup>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ width: "100%" }}
        >
          <LinearProgress />
          {progress && (
            <Typography variant="caption" sx={{ px: 2, py: 0.5 }}>
              {progress} {progressVal.total > 1 ? `${progressVal.current}/${progressVal.total}` : ""}
            </Typography>
          )}
        </motion.div>
      )}

      <Box sx={{ px: 2, py: 1, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
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
        <Typography variant="caption" color="text.secondary">
          Data range: {dateRange().from.toLocaleDateString()} – {dateRange().to.toLocaleDateString()}
        </Typography>
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

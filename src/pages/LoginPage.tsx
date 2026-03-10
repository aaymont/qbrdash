import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { AnimatedCard, AnimatedStaggerContainer, AnimatedStaggerItem } from "@/components/Animated";
import { listClients, addClient, type ClientEntry } from "@/lib/clientRegistry";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const [server, setServer] = useState("my.geotab.com");
  const [database, setDatabase] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const savedClients = listClients();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      let client: ClientEntry | undefined;
      if (selectedClient) {
        client = savedClients.find((c) => c.id === selectedClient) ?? undefined;
        if (client) {
          setServer(client.server);
          setDatabase(client.database);
        }
      }
      const creds = {
        server: server || "my.geotab.com",
        database,
        userName,
        password,
      };
      await login(creds, client);
      if (!selectedClient && (friendlyName || database)) {
        addClient(creds.server, creds.database, friendlyName || database);
      }
      navigate("/", { replace: true });
    } catch {
      // error in state
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (id: string) => {
    setSelectedClient(id);
    const c = savedClients.find((x) => x.id === id);
    if (c) {
      setServer(c.server);
      setDatabase(c.database);
      setFriendlyName(c.friendlyName);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.100",
        p: 2,
      }}
    >
      <AnimatedCard>
        <Card sx={{ maxWidth: 420 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
            Geotab QBR Insights
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sign in to your MyGeotab database
          </Typography>

          {error && (
            <AnimatedStaggerItem>
              <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                {error}
              </Alert>
            </AnimatedStaggerItem>
          )}

          <form onSubmit={handleSubmit}>
            <AnimatedStaggerContainer>
            {savedClients.length > 0 && (
              <AnimatedStaggerItem>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Saved client</InputLabel>
                <Select
                  value={selectedClient}
                  label="Saved client"
                  onChange={(e) => handleSelectClient(e.target.value)}
                >
                  <MenuItem value="">Add new...</MenuItem>
                  {savedClients.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.friendlyName} ({c.database})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              </AnimatedStaggerItem>
            )}

            <AnimatedStaggerItem>
            <TextField
              fullWidth
              label="Server"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              margin="normal"
              placeholder="my.geotab.com"
            />
            </AnimatedStaggerItem>
            <AnimatedStaggerItem>
            <TextField
              fullWidth
              label="Database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              margin="normal"
              required
            />
            </AnimatedStaggerItem>
            <AnimatedStaggerItem>
            <TextField
              fullWidth
              label="Username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            </AnimatedStaggerItem>
            {!selectedClient && (
              <AnimatedStaggerItem>
                <TextField
                  fullWidth
                  label="Friendly name (optional)"
                  value={friendlyName}
                  onChange={(e) => setFriendlyName(e.target.value)}
                  margin="normal"
                  placeholder="Save as..."
                />
              </AnimatedStaggerItem>
            )}

            <AnimatedStaggerItem>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !database || !userName || !password}
              sx={{ mt: 2 }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            </AnimatedStaggerItem>
            </AnimatedStaggerContainer>
          </form>

          <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
            Credentials are not stored. Session is kept in this tab only.
          </Typography>
        </CardContent>
      </Card>
      </AnimatedCard>
    </Box>
  );
}

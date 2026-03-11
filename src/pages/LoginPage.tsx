import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextInput, Banner } from "@geotab/zenith";
import { useAuth } from "@/context/AuthContext";
import { AnimatedCard, AnimatedStaggerContainer, AnimatedStaggerItem } from "@/components/Animated";
import { listClients, addClient, type ClientEntry } from "@/lib/clientRegistry";
import { getCachedCredentials, setCachedCredentials } from "@/lib/credentialCache";

const zenithSpacing = {
  padding: "var(--zenith-spacing-lg, 24px)",
  gap: "var(--zenith-spacing-md, 16px)",
};

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
      setCachedCredentials(creds.server, creds.database, creds.userName, creds.password);
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
    if (!id) {
      setUserName("");
      setPassword("");
      return;
    }
    const c = savedClients.find((x) => x.id === id);
    if (c) {
      setServer(c.server);
      setDatabase(c.database);
      setFriendlyName(c.friendlyName);
      const cached = getCachedCredentials(c.server, c.database);
      if (cached) {
        setUserName(cached.userName);
        setPassword(cached.password);
      } else {
        setUserName("");
        setPassword("");
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--zenith-neutral-100, #EDEBE9)",
        padding: zenithSpacing.padding,
      }}
    >
      <AnimatedCard>
        <div
          style={{
            maxWidth: 420,
            padding: zenithSpacing.padding,
            backgroundColor: "white",
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid var(--zenith-neutral-100, #EDEBE9)",
          }}
        >
          <h1
            style={{
              fontSize: "var(--zenith-font-size-lg, 16px)",
              fontWeight: "var(--zenith-font-weight-bold, 700)",
              margin: "0 0 8px 0",
              color: "var(--zenith-neutral-900, #201F1E)",
            }}
          >
            Geotab QBR Insights
            {typeof __APP_VERSION__ !== "undefined" && (
              <span style={{ marginLeft: 6, fontSize: "0.75em", opacity: 0.85 }}>
                v{__APP_VERSION__}
              </span>
            )}
          </h1>
          <p
            style={{
              fontSize: "var(--zenith-font-size-md, 14px)",
              color: "var(--zenith-neutral-500, #605E5C)",
              margin: "0 0 24px 0",
            }}
          >
            Sign in to your MyGeotab database
          </p>

          {error && (
            <AnimatedStaggerItem>
              <div style={{ marginBottom: 16 }}>
                <Banner type="error" onClose={clearError}>
                  {error}
                </Banner>
              </div>
            </AnimatedStaggerItem>
          )}

          <form onSubmit={handleSubmit}>
            <AnimatedStaggerContainer>
              {savedClients.length > 0 && (
                <AnimatedStaggerItem>
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "var(--zenith-font-size-sm, 12px)",
                        fontWeight: "var(--zenith-font-weight-semibold, 600)",
                        marginBottom: 4,
                        color: "var(--zenith-neutral-700, #3B3A39)",
                      }}
                    >
                      Saved client
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(e) => handleSelectClient(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 14,
                        borderRadius: 4,
                        border: "1px solid var(--zenith-neutral-100, #EDEBE9)",
                        backgroundColor: "white",
                      }}
                    >
                      <option value="">Add new...</option>
                      {savedClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.friendlyName} ({c.database})
                        </option>
                      ))}
                    </select>
                  </div>
                </AnimatedStaggerItem>
              )}

              <AnimatedStaggerItem>
                <div style={{ marginBottom: 16 }}>
                  <TextInput
                    label="Server"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="my.geotab.com"
                  />
                </div>
              </AnimatedStaggerItem>
              <AnimatedStaggerItem>
                <div style={{ marginBottom: 16 }}>
                  <TextInput
                    label="Database"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    required
                  />
                </div>
              </AnimatedStaggerItem>
              <AnimatedStaggerItem>
                <div style={{ marginBottom: 16 }}>
                  <TextInput
                    label="Username"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <TextInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </AnimatedStaggerItem>
              {!selectedClient && (
                <AnimatedStaggerItem>
                  <div style={{ marginBottom: 16 }}>
                    <TextInput
                      label="Friendly name (optional)"
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                      placeholder="Save as..."
                    />
                  </div>
                </AnimatedStaggerItem>
              )}

              <AnimatedStaggerItem>
                <div style={{ marginTop: 16 }} className="zen-button-full-width">
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={loading || !database || !userName || !password}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                </div>
              </AnimatedStaggerItem>
            </AnimatedStaggerContainer>
          </form>

          <p
            style={{
              fontSize: "var(--zenith-font-size-sm, 12px)",
              color: "var(--zenith-neutral-500, #605E5C)",
              margin: "24px 0 0 0",
            }}
          >
            Username and password are cached per client for convenience. Session is kept in this tab only.
          </p>
        </div>
      </AnimatedCard>
    </div>
  );
}

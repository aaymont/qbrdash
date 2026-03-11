import { useState } from "react";

const zenith = {
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral500: "var(--zenith-neutral-500, #605E5C)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  primary: "var(--zenith-primary, #0078D4)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
};

interface SettingsPageProps {
  ttlHours: number;
  onTtlChange: (hours: number) => void;
}

export function SettingsPage({ ttlHours, onTtlChange }: SettingsPageProps) {
  const [localTtl, setLocalTtl] = useState(ttlHours);

  return (
    <div style={{ padding: 24, maxWidth: 480, fontFamily: zenith.fontFamily }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px 0", color: zenith.neutral900 }}>
        Settings
      </h2>
      <p style={{ fontSize: 14, color: zenith.neutral500, margin: "8px 0 16px 0" }}>
        Cache TTL (hours): Data is considered fresh for this many hours before requiring a refresh.
      </p>
      <input
        type="range"
        min={1}
        max={48}
        step={1}
        value={localTtl}
        onChange={(e) => setLocalTtl(Number(e.target.value))}
        onMouseUp={(e) => onTtlChange(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onTtlChange(Number((e.target as HTMLInputElement).value))}
        style={{
          width: "100%",
          marginTop: 16,
          accentColor: zenith.primary,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: zenith.neutral500 }}>
        <span>1h</span>
        <span>12h</span>
        <span>24h</span>
        <span>48h</span>
      </div>
      <p style={{ fontSize: 12, color: zenith.neutral500, marginTop: 8 }}>
        Current: {localTtl} hours
      </p>
    </div>
  );
}

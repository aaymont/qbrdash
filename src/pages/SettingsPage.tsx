import { useState } from "react";
import { Box, Typography, Slider } from "@mui/material";

interface SettingsPageProps {
  ttlHours: number;
  onTtlChange: (hours: number) => void;
}

export function SettingsPage({ ttlHours, onTtlChange }: SettingsPageProps) {
  const [localTtl, setLocalTtl] = useState(ttlHours);

  return (
    <Box sx={{ p: 3, maxWidth: 480 }}>
      <Typography variant="h6">Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Cache TTL (hours): Data is considered fresh for this many hours before requiring a refresh.
      </Typography>
      <Slider
        value={localTtl}
        onChange={(_, v) => setLocalTtl(v as number)}
        onChangeCommitted={(_, v) => onTtlChange(v as number)}
        min={1}
        max={48}
        step={1}
        valueLabelDisplay="auto"
        marks={[
          { value: 1, label: "1h" },
          { value: 12, label: "12h" },
          { value: 24, label: "24h" },
          { value: 48, label: "48h" },
        ]}
        sx={{ mt: 2 }}
      />
      <Typography variant="caption">Current: {localTtl} hours</Typography>
    </Box>
  );
}

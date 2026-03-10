import { Box, Paper, Typography } from "@mui/material";
import { AnimatedCard } from "./Animated";

interface KpiTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  index?: number;
}

export function KpiTile({ title, value, subtitle, trend, index = 0 }: KpiTileProps) {
  return (
    <AnimatedCard index={index}>
      <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        height: "100%",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 600 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      {trend && (
        <Box
          component="span"
          sx={{
            ml: 0.5,
            color:
              trend === "up"
                ? "success.main"
                : trend === "down"
                ? "error.main"
                : "text.secondary",
          }}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
        </Box>
      )}
    </Paper>
    </AnimatedCard>
  );
}

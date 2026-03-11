import { Box, Paper, Typography } from "@mui/material";
import { AnimatedCard } from "./Animated";

interface KpiTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  index?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function KpiTile({ title, value, subtitle, trend, index = 0, selected, onClick }: KpiTileProps) {
  return (
    <AnimatedCard index={index}>
      <Paper
      elevation={0}
      component={onClick ? "button" : "div"}
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        height: "100%",
        width: "100%",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        font: "inherit",
        bgcolor: selected ? "action.selected" : undefined,
        "&:hover": onClick ? { bgcolor: "action.hover" } : undefined,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 600, fontSize: { xs: "1rem", sm: "1.1rem" } }}>
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

import { AnimatedCard } from "./Animated";

const zenith = {
  primary: "var(--zenith-primary, #0078D4)",
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral500: "var(--zenith-neutral-500, #605E5C)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  success: "var(--zenith-success, #107C10)",
  error: "var(--zenith-error, #D13438)",
  spacing: "var(--zenith-spacing-md, 16px)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
};

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
      <div
        role={onClick ? "button" : undefined}
        onClick={onClick}
        style={{
          padding: zenith.spacing,
          borderRadius: 8,
          border: `1px solid ${selected ? zenith.primary : zenith.neutral100}`,
          borderWidth: selected ? 2 : 1,
          height: "100%",
          width: "100%",
          cursor: onClick ? "pointer" : "default",
          textAlign: "left",
          fontFamily: zenith.fontFamily,
          backgroundColor: selected ? "rgba(0, 120, 212, 0.08)" : "white",
          boxSizing: "border-box",
        }}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        <div style={{ fontSize: 12, color: zenith.neutral500, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: zenith.neutral900 }}>
          {value}
          {trend && (
            <span
              style={{
                marginLeft: 4,
                color:
                  trend === "up"
                    ? zenith.success
                    : trend === "down"
                    ? zenith.error
                    : zenith.neutral500,
              }}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: zenith.neutral500, marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}

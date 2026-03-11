import { Children } from "react";
import { zenith } from "@/lib/theme";

interface KpiGridProps {
  children: React.ReactNode;
  variant?: "grid" | "flex";
}

export function KpiGrid({ children, variant = "grid" }: KpiGridProps) {
  if (variant === "flex") {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: zenith.spacing,
        }}
      >
        {Children.toArray(children).map((child, i) => (
          <div key={i} style={{ flex: "1 1 0", minWidth: 140 }}>
            {child}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: zenith.spacing,
      }}
    >
      {children}
    </div>
  );
}

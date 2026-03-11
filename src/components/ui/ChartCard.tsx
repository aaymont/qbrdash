import { zenith } from "@/lib/theme";

interface ChartCardProps {
  children: React.ReactNode;
  height?: number;
}

export function ChartCard({ children, height = 280 }: ChartCardProps) {
  return (
    <div
      style={{
        height,
        backgroundColor: "white",
        borderRadius: 8,
        padding: zenith.spacing,
        border: `1px solid ${zenith.neutral100}`,
      }}
    >
      {children}
    </div>
  );
}

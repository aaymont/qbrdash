import { ResponsiveBar } from "@nivo/bar";
import { AnimatedChart } from "../Animated";
import { nivoTheme } from "@/lib/nivoTheme";
import { zenith } from "@/lib/theme";

export interface BarConfig {
  dataKey: string;
  fill: string;
  name: string;
}

export type VerticalBarTooltipParams<T> = {
  entry: T;
  value: number;
  indexValue: string;
  barLabel?: string;
};

interface VerticalBarChartProps<T extends object> {
  data: T[];
  dataKey?: string;
  nameKey?: string;
  barFill?: string;
  barName?: string;
  bars?: BarConfig[];
  /** Nivo-compatible tooltip: receives entry, value, indexValue */
  tooltipContent?: (params: VerticalBarTooltipParams<T>) => React.ReactNode;
  /** Return a fill color per data point for varied bar colors */
  getBarFill?: (entry: T, index: number) => string;
}

export function VerticalBarChart<T extends object>({
  data,
  dataKey,
  nameKey = "name",
  barFill = "var(--zenith-primary, #0078D4)",
  barName,
  bars,
  tooltipContent,
  getBarFill,
}: VerticalBarChartProps<T>) {
  const keys = bars ? bars.map((b) => b.dataKey) : dataKey ? [dataKey] : [];
  const grouped = !!bars;

  const getBarColor = grouped
    ? (bar: { id: string | number }) => bars!.find((b) => b.dataKey === String(bar.id))?.fill ?? barFill
    : getBarFill
      ? (bar: { index: number }) => getBarFill(data[bar.index] as T, bar.index)
      : barFill;

  return (
    <AnimatedChart>
      <ResponsiveBar
        data={data as Record<string, string | number>[]}
        keys={keys}
        indexBy={nameKey}
        layout="vertical"
        groupMode={grouped ? "grouped" : "grouped"}
        margin={{ top: 8, right: 8, bottom: 24, left: 32 }}
        padding={0.3}
        theme={nivoTheme}
        colors={getBarColor}
        borderRadius={4}
        enableGridX={false}
        enableGridY
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
        }}
        tooltip={
          tooltipContent
            ? ({ id, value, indexValue }) => {
                const entry = data.find((r) => (r as Record<string, unknown>)[nameKey] === indexValue) as T | undefined;
                if (!entry) return null;
                const barLabel = bars?.find((b) => b.dataKey === id)?.name ?? barName ?? (id as string);
                return tooltipContent({
                  entry,
                  value: value as number,
                  indexValue: String(indexValue),
                  barLabel,
                });
              }
            : ({ id, value, indexValue }) => {
                const barLabel = bars?.find((b) => b.dataKey === id)?.name ?? barName ?? (id as string);
                return (
                  <div
                    style={{
                      background: "white",
                      padding: "8px 12px",
                      borderRadius: 6,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      fontSize: 13,
                      border: `1px solid ${zenith.neutral100}`,
                    }}
                  >
                    <strong>{indexValue}</strong>: {barLabel} {value}
                  </div>
                );
              }
        }
      />
    </AnimatedChart>
  );
}

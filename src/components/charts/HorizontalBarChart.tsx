import { ResponsiveBar } from "@nivo/bar";
import { linearGradientDef } from "@nivo/core";
import { AnimatedChart } from "../Animated";
import { nivoTheme } from "@/lib/nivoTheme";
import { zenith } from "@/lib/theme";

export interface BarConfig {
  dataKey: string;
  fill: string;
  name: string;
}

interface HorizontalBarChartProps<T extends object> {
  data: T[];
  dataKey: string;
  nameKey?: string;
  unit?: string;
  barFill?: string;
  barName?: string;
  gradientId?: string;
  bars?: BarConfig[];
  yAxisWidth?: number;
  formatValue?: (payload: T, value: unknown) => string;
  showPct?: boolean;
  pctKey?: string;
}

export function HorizontalBarChart<T extends object>({
  data,
  dataKey,
  nameKey = "name",
  unit,
  barFill = "var(--zenith-primary, #0078D4)",
  barName,
  gradientId,
  bars,
  yAxisWidth = 80,
  formatValue,
}: HorizontalBarChartProps<T>) {
  const keys = bars ? bars.map((b) => b.dataKey) : [dataKey];
  const grouped = !!bars;

  const defs = gradientId
    ? [
        linearGradientDef(
          gradientId,
          [
            { offset: 0, color: "#d32f2f" },
            { offset: 100, color: "#2e7d32" },
          ],
          { x1: 0, x2: 1, y1: 0, y2: 0 }
        ),
      ]
    : undefined;

  const fill = gradientId && !grouped ? [{ match: { id: dataKey }, id: gradientId }] : undefined;

  const getBarColor = grouped
    ? (bar: { id: string | number }) => bars!.find((b) => b.dataKey === String(bar.id))?.fill ?? barFill
    : gradientId
      ? () => `url(#${gradientId})`
      : barFill;

  const formatAxisValue = (v: number) => (unit ? `${v}${unit}` : `${v}`);
  const formatTooltipValue = (value: number, payload: T) =>
    formatValue ? formatValue(payload, value) : formatAxisValue(value);

  const displayData = [...data].reverse() as Record<string, string | number>[];

  return (
    <AnimatedChart>
      <ResponsiveBar
        data={displayData}
        keys={keys}
        indexBy={nameKey}
        layout="horizontal"
        groupMode={grouped ? "grouped" : "grouped"}
        margin={{ top: 16, right: 24, bottom: 36, left: yAxisWidth }}
        padding={0.3}
        theme={nivoTheme}
        defs={defs}
        fill={fill}
        colors={getBarColor}
        enableGridX
        enableGridY={false}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          format: formatAxisValue,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
        }}
        enableLabel={!grouped}
        labelTextColor="#ffffff"
        label={
          !grouped && formatValue
            ? (d) => {
                const row = displayData[d.index] as T;
                const val = (row as Record<string, unknown>)[d.id] as number;
                if (val == null) return "";
                const barWidth = "width" in d && typeof (d as { width?: number }).width === "number"
                  ? (d as { width: number }).width
                  : 999;
                if (barWidth < 40) return "";
                return formatValue(row, val);
              }
            : undefined
        }
        tooltip={({ id, value, indexValue, data: row }) => {
          const payload = displayData.find((r) => (r as Record<string, unknown>)[nameKey] === indexValue) ?? row;
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
              <strong>{indexValue}</strong>: {barLabel} {formatTooltipValue(value as number, payload as T)}
            </div>
          );
        }}
      />
    </AnimatedChart>
  );
}

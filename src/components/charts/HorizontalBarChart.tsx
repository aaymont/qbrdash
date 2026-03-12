import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AnimatedChart } from "../Animated";
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
  showPct: _showPct = false,
  pctKey: _pctKey = "pct",
}: HorizontalBarChartProps<T>) {
  const tickFill = zenith.neutral700;

  return (
    <AnimatedChart>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: yAxisWidth, right: 24 }}>
          {gradientId && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d32f2f" />
                <stop offset="100%" stopColor="#2e7d32" />
              </linearGradient>
            </defs>
          )}
          <CartesianGrid strokeDasharray="3 3" stroke={zenith.neutral100} />
          <XAxis type="number" unit={unit} tick={{ fill: tickFill }} />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={yAxisWidth}
            interval={0}
            tick={{ fill: tickFill }}
          />
          <Tooltip
            formatter={
              formatValue
                ? (value, _name, item) => {
                    const payload = item?.payload as T;
                    return formatValue(payload, value);
                  }
                : undefined
            }
          />
          {bars ? (
            bars.map((b) => (
              <Bar key={b.dataKey} dataKey={b.dataKey} fill={b.fill} name={b.name} />
            ))
          ) : (
            <Bar
              dataKey={dataKey}
              fill={gradientId ? `url(#${gradientId})` : barFill}
              name={barName ?? dataKey}
              isAnimationActive={false}
              label={
                formatValue
                  ? (props: {
                      x?: number;
                      y?: number;
                      width?: number;
                      height?: number;
                      payload?: T;
                    }) => {
                      const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                      if (!payload || width < 40) return <g />;
                      const value = (payload as Record<string, unknown>)[dataKey];
                      return (
                        <text
                          x={x + width - 6}
                          y={y + height / 2}
                          textAnchor="end"
                          dominantBaseline="middle"
                          fill="white"
                          style={{ fontSize: 12, fontWeight: 500 }}
                        >
                          {formatValue(payload, value)}
                        </text>
                      );
                    }
                  : false
              }
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </AnimatedChart>
  );
}

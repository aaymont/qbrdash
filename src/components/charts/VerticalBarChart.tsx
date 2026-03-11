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

interface VerticalBarChartProps<T extends object> {
  data: T[];
  dataKey?: string;
  nameKey?: string;
  barFill?: string;
  barName?: string;
  bars?: BarConfig[];
}

export function VerticalBarChart<T extends object>({
  data,
  dataKey,
  nameKey = "name",
  barFill = "var(--zenith-primary, #0078D4)",
  barName,
  bars,
}: VerticalBarChartProps<T>) {
  return (
    <AnimatedChart>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={zenith.neutral100} />
          <XAxis dataKey={nameKey} tick={{ fill: zenith.neutral500 }} />
          <YAxis tick={{ fill: zenith.neutral500 }} />
          <Tooltip />
          {bars ? (
            bars.map((b) => (
              <Bar key={b.dataKey} dataKey={b.dataKey} fill={b.fill} name={b.name} />
            ))
          ) : dataKey ? (
            <Bar dataKey={dataKey} fill={barFill} name={barName ?? dataKey} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </AnimatedChart>
  );
}

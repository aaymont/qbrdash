import type { TooltipProps } from "recharts";
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
  tooltipContent?: React.ComponentType<TooltipProps<number, string>>;
}

export function VerticalBarChart<T extends object>({
  data,
  dataKey,
  nameKey = "name",
  barFill = "var(--zenith-primary, #0078D4)",
  barName,
  bars,
  tooltipContent,
}: VerticalBarChartProps<T>) {
  return (
    <AnimatedChart>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={zenith.neutral100} vertical={false} />
          <XAxis dataKey={nameKey} tick={{ fill: zenith.neutral500, fontSize: 12 }} />
          <YAxis tick={{ fill: zenith.neutral500, fontSize: 12 }} allowDecimals={false} />
          <Tooltip content={tooltipContent} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          {bars ? (
            bars.map((b) => (
              <Bar key={b.dataKey} dataKey={b.dataKey} fill={b.fill} name={b.name} radius={[4, 4, 0, 0]} />
            ))
          ) : dataKey ? (
            <Bar dataKey={dataKey} fill={barFill} name={barName ?? dataKey} radius={[4, 4, 0, 0]} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
    </AnimatedChart>
  );
}

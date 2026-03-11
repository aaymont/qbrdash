import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatedChart } from "../Animated";

export interface PieDataItem {
  name: string;
  value: number;
  color: string;
  pct?: number;
}

interface PieChartCardProps {
  data: PieDataItem[];
  formatValue?: (value: number) => string;
  outerRadius?: number;
  innerRadius?: number;
  label?: (item: { name: string; value: number; pct?: number }) => string;
  /** Hide labels on pie segments to avoid clipping in narrow containers */
  hideLabels?: boolean;
}

export function PieChartCard({
  data,
  formatValue = (v) => `${v}`,
  outerRadius = 80,
  innerRadius,
  label,
  hideLabels = false,
}: PieChartCardProps) {
  const defaultLabel = ({ name, value, pct }: { name: string; value: number; pct?: number }) =>
    `${name}: ${formatValue(value)}${pct != null ? ` (${pct.toFixed(1)}%)` : ""}`;

  return (
    <AnimatedChart>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={hideLabels ? undefined : { top: 24, right: 120, bottom: 24, left: 120 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={innerRadius ? 2 : undefined}
            label={hideLabels ? false : (label ?? defaultLabel)}
          >
            {data.map((e, i) => (
              <Cell key={i} fill={e.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, _: string, props: { payload?: { pct?: number } }) => {
              const pct = props?.payload?.pct;
              return formatValue(v) + (pct != null ? ` (${pct.toFixed(1)}%)` : "");
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </AnimatedChart>
  );
}

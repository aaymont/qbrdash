import { ResponsivePie } from "@nivo/pie";
import { positionFromAngle, radiansToDegrees } from "@nivo/core";
import { AnimatedChart } from "../Animated";
import { nivoTheme } from "@/lib/nivoTheme";

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
  /** Chart container height; larger values make the pie bigger */
  height?: number;
  label?: (item: { name: string; value: number; pct?: number }) => string;
  /** Hide labels on pie segments to avoid clipping in narrow containers */
  hideLabels?: boolean;
  /** Override chart margin (e.g. reduce bottom padding) */
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Font size for arc labels (default 13) */
  arcLabelFontSize?: number;
}

const SKIP_ANGLE = 12;
const LABEL_RADIUS_OFFSET = 0.5;

function createMultilineArcLabelsLayer(
  formatValue: (v: number) => string,
  fontSize: number
) {
  const lineHeight = Math.round(fontSize * 1.15);
  return function MultilineArcLabelsLayer({
    dataWithArc,
    centerX,
    centerY,
  }: {
    dataWithArc: Array<{
      id: string | number;
      data: PieDataItem & { id?: string; label?: string };
      arc: { startAngle: number; endAngle: number; innerRadius: number; outerRadius: number };
    }>;
    centerX: number;
    centerY: number;
  }) {
    return (
      <g>
        {dataWithArc
          .filter(
            (d) => Math.abs(radiansToDegrees(d.arc.endAngle - d.arc.startAngle)) >= SKIP_ANGLE
          )
          .map((d) => {
            const arc = d.arc;
            const midAngle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2 - Math.PI / 2;
            const radius =
              arc.innerRadius + (arc.outerRadius - arc.innerRadius) * LABEL_RADIUS_OFFSET;
            const pos = positionFromAngle(midAngle, radius);
            const x = centerX + pos.x;
            const y = centerY + pos.y;
            const item = d.data as PieDataItem;
            const lines = [
              item.name,
              formatValue(item.value),
              item.pct != null ? `${item.pct.toFixed(0)}%` : "",
            ].filter(Boolean);
            return (
              <text
                key={d.id}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                style={{
                  fontSize,
                  fontWeight: 500,
                  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
                }}
              >
                {lines.map((line, i) => (
                  <tspan key={i} x={x} dy={i === 0 ? -(lines.length - 1) * (lineHeight / 2) : lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
      </g>
    );
  };
}

const DEFAULT_MARGIN = { top: 24, right: 24, bottom: 24, left: 24 };

export function PieChartCard({
  data,
  formatValue = (v) => `${v}`,
  outerRadius: _outerRadius = 80,
  innerRadius,
  height,
  label: _label,
  hideLabels = false,
  margin: marginOverride,
  arcLabelFontSize = 13,
}: PieChartCardProps) {
  const nivoData = data.map((d) => ({
    ...d,
    id: d.name,
    label: d.name,
  }));

  const margin = marginOverride
    ? { ...DEFAULT_MARGIN, ...marginOverride }
    : DEFAULT_MARGIN;
  const multilineLayer = createMultilineArcLabelsLayer(formatValue, arcLabelFontSize);

  return (
    <AnimatedChart>
      <div style={height ? { height, minHeight: height } : undefined}>
        <ResponsivePie
          data={nivoData}
          theme={nivoTheme}
          margin={margin}
          innerRadius={innerRadius ?? 0}
          padAngle={innerRadius ? 2 : 0}
          cornerRadius={2}
          colors={(datum) => (datum.data as PieDataItem & { color: string }).color}
          enableArcLinkLabels={false}
          enableArcLabels={false}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          layers={hideLabels ? ["arcs"] : (["arcs", multilineLayer] as any)}
        tooltip={({ datum }) => {
          const item = datum.data as PieDataItem & { id: string };
          return (
            <div
              style={{
                background: "white",
                padding: "8px 12px",
                borderRadius: 6,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                fontSize: 13,
                border: `1px solid ${item.color}40`,
              }}
            >
              <strong>{item.name}</strong>: {formatValue(item.value)}
              {item.pct != null ? ` (${item.pct.toFixed(1)}%)` : ""}
            </div>
          );
        }}
        />
      </div>
    </AnimatedChart>
  );
}

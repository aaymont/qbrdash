import { IconLightBulb, IconClipboard } from "@geotab/zenith";
import { zenith } from "@/lib/theme";

interface Insight {
  text: string;
  metric?: string;
}

interface Action {
  action: string;
  kpi: string;
  target: string;
  owner: string;
  dueDate: string;
}

interface InsightsPanelProps {
  insights: Insight[];
  actions: Action[];
  /** When true, panel is hidden (display: none) but not removed. */
  hidden?: boolean;
}

export function InsightsPanel({ insights, actions, hidden }: InsightsPanelProps) {
  const content = (
    <div
      style={{
        padding: zenith.spacing,
        border: `1px solid ${zenith.neutral100}`,
        borderRadius: 8,
        backgroundColor: "white",
      }}
    >
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          margin: "0 0 16px 0",
          fontFamily: zenith.fontFamily,
          color: zenith.neutral900,
        }}
      >
        Insights and Actions
      </h3>

      <div style={{ fontSize: 11, fontWeight: 600, color: zenith.primary, marginTop: 16, textTransform: "uppercase" }}>
        Data-backed insights
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0" }}>
        {insights.slice(0, 5).map((i, idx) => (
          <li
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "4px 0",
              fontSize: 14,
              color: zenith.neutral900,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 2 }}>
              <IconLightBulb />
            </span>
            <span>
              {i.text}
              {i.metric && (
                <span style={{ display: "block", fontSize: 12, color: zenith.neutral500 }}>{i.metric}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div style={{ fontSize: 11, fontWeight: 600, color: zenith.primary, marginTop: 16, textTransform: "uppercase" }}>
        Recommended actions
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0" }}>
        {actions.slice(0, 5).map((a, idx) => (
          <li
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "4px 0",
              fontSize: 14,
              color: zenith.neutral900,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 2 }}>
              <IconClipboard />
            </span>
            <span>{a.action}</span>
          </li>
        ))}
      </ul>

      <div style={{ fontSize: 11, fontWeight: 600, color: zenith.primary, marginTop: 16, textTransform: "uppercase" }}>
        Action plan
      </div>
      <div style={{ marginTop: 8, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral700 }}>
                Action
              </th>
              <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral700 }}>
                KPI impacted
              </th>
              <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral700 }}>
                Target
              </th>
              <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral700 }}>
                Owner
              </th>
              <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral700 }}>
                Due
              </th>
            </tr>
          </thead>
          <tbody>
            {actions.slice(0, 5).map((a, idx) => (
              <tr key={idx}>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral900 }}>
                  {a.action}
                </td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral900 }}>
                  {a.kpi}
                </td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral900 }}>
                  {a.target}
                </td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral900 }}>
                  {a.owner}
                </td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${zenith.neutral100}`, color: zenith.neutral900 }}>
                  {a.dueDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  return hidden ? <div style={{ display: "none" }}>{content}</div> : content;
}

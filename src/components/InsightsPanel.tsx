import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import AssignmentIcon from "@mui/icons-material/Assignment";

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
}

export function InsightsPanel({ insights, actions }: InsightsPanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Insights and Actions
      </Typography>

      <Typography variant="overline" color="primary" sx={{ display: "block", mt: 2 }}>
        Data-backed insights
      </Typography>
      <List dense disablePadding>
        {insights.slice(0, 5).map((i, idx) => (
          <ListItem key={idx} disablePadding sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <LightbulbIcon fontSize="small" color="action" />
            </ListItemIcon>
            <ListItemText primary={i.text} secondary={i.metric} />
          </ListItem>
        ))}
      </List>

      <Typography variant="overline" color="primary" sx={{ display: "block", mt: 2 }}>
        Recommended actions
      </Typography>
      <List dense disablePadding>
        {actions.slice(0, 5).map((a, idx) => (
          <ListItem key={idx} disablePadding sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <AssignmentIcon fontSize="small" color="action" />
            </ListItemIcon>
            <ListItemText primary={a.action} />
          </ListItem>
        ))}
      </List>

      <Typography variant="overline" color="primary" sx={{ display: "block", mt: 2 }}>
        Action plan
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Action</TableCell>
              <TableCell>KPI impacted</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Due</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {actions.slice(0, 5).map((a, idx) => (
              <TableRow key={idx}>
                <TableCell>{a.action}</TableCell>
                <TableCell>{a.kpi}</TableCell>
                <TableCell>{a.target}</TableCell>
                <TableCell>{a.owner}</TableCell>
                <TableCell>{a.dueDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

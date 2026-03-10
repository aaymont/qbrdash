import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#9c27b0",
      light: "#ba68c8",
      dark: "#7b1fa2",
    },
    success: {
      main: "#2e7d32",
    },
    warning: {
      main: "#ed6c02",
    },
    error: {
      main: "#d32f2f",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    "none",
    "0px 2px 4px rgba(0,0,0,0.05)",
    "0px 4px 8px rgba(0,0,0,0.06)",
    "0px 6px 12px rgba(0,0,0,0.07)",
    "0px 8px 16px rgba(0,0,0,0.08)",
    "0px 10px 20px rgba(0,0,0,0.08)",
    "0px 12px 24px rgba(0,0,0,0.09)",
    "0px 14px 28px rgba(0,0,0,0.09)",
    "0px 16px 32px rgba(0,0,0,0.1)",
    "0px 18px 36px rgba(0,0,0,0.1)",
    "0px 20px 40px rgba(0,0,0,0.1)",
    "0px 22px 44px rgba(0,0,0,0.11)",
    "0px 24px 48px rgba(0,0,0,0.11)",
    "0px 26px 52px rgba(0,0,0,0.11)",
    "0px 28px 56px rgba(0,0,0,0.12)",
    "0px 30px 60px rgba(0,0,0,0.12)",
    "0px 32px 64px rgba(0,0,0,0.12)",
    "0px 34px 68px rgba(0,0,0,0.13)",
    "0px 36px 72px rgba(0,0,0,0.13)",
    "0px 38px 76px rgba(0,0,0,0.13)",
    "0px 40px 80px rgba(0,0,0,0.14)",
    "0px 42px 84px rgba(0,0,0,0.14)",
    "0px 44px 88px rgba(0,0,0,0.14)",
    "0px 46px 92px rgba(0,0,0,0.15)",
    "0px 48px 96px rgba(0,0,0,0.15)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          transition: "all 0.2s ease-in-out",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0px 4px 12px rgba(0,0,0,0.06)",
          transition: "box-shadow 0.2s ease-in-out",
          "&:hover": {
            boxShadow: "0px 6px 16px rgba(0,0,0,0.08)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0px 2px 12px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "transform 0.15s ease-in-out",
          "&:hover": {
            transform: "scale(1.02)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "background-color 0.2s ease-in-out, transform 0.15s ease-in-out",
          "&:hover": {
            transform: "scale(1.05)",
          },
        },
      },
    },
  },
});

import "@geotab/zenith/dist/index.css";
import "@/zenith-overrides.css";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { FeedbackProvider } from "@geotab/zenith";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DistanceUnitProvider } from "@/context/DistanceUnitContext";
import { AnimatedPage } from "@/components/Animated";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname || "/"}>
        <Route
          path="/login"
          element={
            <AnimatedPage>
              <LoginPage />
            </AnimatedPage>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AnimatedPage>
                <DashboardPage />
              </AnimatedPage>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <FeedbackProvider>
      <AuthProvider>
        <DistanceUnitProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </DistanceUnitProvider>
      </AuthProvider>
    </FeedbackProvider>
  );
}

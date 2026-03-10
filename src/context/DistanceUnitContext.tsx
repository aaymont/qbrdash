import { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  getDistanceUnit,
  setDistanceUnit as persistUnit,
  type DistanceUnit,
} from "@/lib/distanceUnit";

interface DistanceUnitContextValue {
  unit: DistanceUnit;
  setUnit: (u: DistanceUnit) => void;
  formatDistance: (km: number) => string;
  toDisplayValue: (km: number) => number;
}

const DistanceUnitContext = createContext<DistanceUnitContextValue | null>(null);

export function DistanceUnitProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<DistanceUnit>(() => getDistanceUnit());

  useEffect(() => {
    persistUnit(unit);
  }, [unit]);

  const setUnit = useCallback((u: DistanceUnit) => {
    setUnitState(u);
  }, []);

  const formatDistance = useCallback(
    (km: number) => {
      const value = unit === "mi" ? km * 0.621371 : km;
      const suffix = unit === "mi" ? " mi" : " km";
      return `${Math.round(value).toLocaleString()}${suffix}`;
    },
    [unit]
  );

  const toDisplayValue = useCallback(
    (km: number) => (unit === "mi" ? km * 0.621371 : km),
    [unit]
  );

  return (
    <DistanceUnitContext.Provider value={{ unit, setUnit, formatDistance, toDisplayValue }}>
      {children}
    </DistanceUnitContext.Provider>
  );
}

export function useDistanceUnit() {
  const ctx = useContext(DistanceUnitContext);
  if (!ctx) throw new Error("useDistanceUnit must be used within DistanceUnitProvider");
  return ctx;
}

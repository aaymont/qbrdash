export type DistanceUnit = "km" | "mi";

const STORAGE_KEY = "qbr_distance_unit";
const KM_TO_MI = 0.621371;

export function getDistanceUnit(): DistanceUnit {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "mi" || stored === "km") return stored;
  } catch {
    // ignore
  }
  return "km";
}

export function setDistanceUnit(unit: DistanceUnit): void {
  try {
    localStorage.setItem(STORAGE_KEY, unit);
  } catch {
    // ignore
  }
}

export function kmToMiles(km: number): number {
  return km * KM_TO_MI;
}

/**
 * Convert km to the display unit and format for display.
 */
export function formatDistance(km: number, unit: DistanceUnit): string {
  const value = unit === "mi" ? kmToMiles(km) : km;
  const suffix = unit === "mi" ? " mi" : " km";
  return `${value.toFixed(1)}${suffix}`;
}

export function formatHours(sec: number): string {
  return `${(sec / 3600).toFixed(1)} h`;
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${(sec / 60).toFixed(0)}m`;
}

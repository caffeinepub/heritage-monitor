import type { ConditionStatus } from "../backend.d";

export type ConditionLevel = "good" | "fair" | "poor" | "critical";

export function getConditionLevel(value: number): ConditionLevel {
  if (value >= 75) return "good";
  if (value >= 50) return "fair";
  if (value >= 25) return "poor";
  return "critical";
}

export function getConditionLabel(level: ConditionLevel): string {
  return { good: "Good", fair: "Fair", poor: "Poor", critical: "Critical" }[
    level
  ];
}

export function getConditionColor(level: ConditionLevel): string {
  return {
    good: "oklch(0.65 0.15 145)",
    fair: "oklch(0.72 0.16 80)",
    poor: "oklch(0.65 0.18 50)",
    critical: "oklch(0.55 0.22 25)",
  }[level];
}

export function getConditionBadgeClass(level: ConditionLevel): string {
  return {
    good: "bg-green-100 text-green-800 border-green-200",
    fair: "bg-yellow-100 text-yellow-800 border-yellow-200",
    poor: "bg-orange-100 text-orange-800 border-orange-200",
    critical: "bg-red-100 text-red-800 border-red-200",
  }[level];
}

export function averageCondition(status: ConditionStatus): number {
  return (
    (Number(status.foundation) + Number(status.walls) + Number(status.roof)) / 3
  );
}

export function overallConditionLevel(status: ConditionStatus): ConditionLevel {
  return getConditionLevel(averageCondition(status));
}

export function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp);
  // Handle both nanosecond (ICP) and millisecond timestamps
  const date = ms > 1e15 ? new Date(ms / 1_000_000) : new Date(ms);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getSeverityClass(severity: string): string {
  return (
    {
      low: "bg-blue-50 text-blue-700 border-blue-200",
      medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
      high: "bg-red-50 text-red-700 border-red-200",
    }[severity] ?? "bg-stone-50 text-stone-700 border-stone-200"
  );
}

export function getCategoryClass(category: string): string {
  return (
    {
      foundation: "bg-stone-100 text-stone-700 border-stone-200",
      walls: "bg-amber-50 text-amber-700 border-amber-200",
      roof: "bg-orange-50 text-orange-700 border-orange-200",
      general: "bg-purple-50 text-purple-700 border-purple-200",
    }[category] ?? "bg-stone-100 text-stone-700 border-stone-200"
  );
}

export function groupEntriesByMonth(
  entries: Array<{ date: bigint }>,
): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const entry of entries) {
    const ms = Number(entry.date);
    const date = ms > 1e15 ? new Date(ms / 1_000_000) : new Date(ms);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    groups[key] = (groups[key] ?? 0) + 1;
  }
  return groups;
}

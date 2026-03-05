import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  Loader2,
  LogIn,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { DamageEntry, Structure } from "../backend.d";
import { DamageCategory, DamageSeverity } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddDamageEntry,
  useDeleteDamageEntry,
  useGetDamageSummary,
  useListDamageEntries,
} from "../hooks/useQueries";
import {
  formatDate,
  getCategoryClass,
  getSeverityClass,
} from "../utils/heritage";

interface DamageLogTabProps {
  structure: Structure;
}

type TimelinePoint = {
  month: string;
  low: number;
  medium: number;
  high: number;
};

function groupEntriesByMonthSeverity(entries: DamageEntry[]): TimelinePoint[] {
  const map: Record<string, { low: number; medium: number; high: number }> = {};

  for (const entry of entries) {
    const ms = Number(entry.date);
    const date = ms > 1e15 ? new Date(ms / 1_000_000) : new Date(ms);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!map[key]) map[key] = { low: 0, medium: 0, high: 0 };

    if (entry.severity === "low") map[key].low += 1;
    else if (entry.severity === "medium") map[key].medium += 1;
    else if (entry.severity === "high") map[key].high += 1;
  }

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }));
}

// Custom tooltip for the timeline chart
function TimelineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, p) => sum + p.value, 0);

  return (
    <div
      style={{
        background: "oklch(0.14 0.02 55)",
        border: "1px solid oklch(0.28 0.04 55)",
        borderRadius: 10,
        padding: "10px 14px",
        fontFamily: "Cabinet Grotesk, sans-serif",
        boxShadow: "0 8px 32px oklch(0.08 0.02 55 / 0.5)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "oklch(0.75 0.04 70)",
          marginBottom: 8,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      {payload.map((p) => (
        <div
          key={p.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: p.color,
              boxShadow: `0 0 6px ${p.color}`,
            }}
          />
          <span style={{ fontSize: 12, color: "oklch(0.65 0.03 70)", flex: 1 }}>
            {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "oklch(0.94 0.02 70)",
            }}
          >
            {p.value}
          </span>
        </div>
      ))}
      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid oklch(0.28 0.04 55)",
          fontSize: 11,
          color: "oklch(0.55 0.02 70)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Total incidents</span>
        <span style={{ fontWeight: 700, color: "oklch(0.85 0.04 70)" }}>
          {total}
        </span>
      </div>
    </div>
  );
}

// Redesigned Degradation Analysis Panel
function DegradationAnalysisPanel({
  timelineData,
  hasEnoughForTimeline,
  latestMonth,
  severityData,
  total,
  summary,
}: {
  timelineData: TimelinePoint[];
  hasEnoughForTimeline: boolean;
  latestMonth: string | null;
  severityData: Array<{ name: string; count: number; fill: string }>;
  total: number;
  summary:
    | { low: bigint | number; medium: bigint | number; high: bigint | number }
    | null
    | undefined;
}) {
  const highVal = summary ? Number(summary.high) : 0;
  const medVal = summary ? Number(summary.medium) : 0;
  const lowVal = summary ? Number(summary.low) : 0;
  const totalVal = highVal + medVal + lowVal;
  const riskScore =
    totalVal > 0 ? Math.round((highVal * 100 + medVal * 40) / totalVal) : 0;
  const riskLabel =
    riskScore >= 70
      ? "Critical"
      : riskScore >= 40
        ? "Elevated"
        : riskScore >= 15
          ? "Moderate"
          : "Low";
  const riskColor =
    riskScore >= 70
      ? "oklch(0.52 0.20 25)"
      : riskScore >= 40
        ? "oklch(0.60 0.14 80)"
        : riskScore >= 15
          ? "oklch(0.65 0.12 230)"
          : "oklch(0.55 0.14 145)";

  return (
    <motion.div
      data-ocid="damage.panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* ── Section Header ── */}
      <div className="flex items-center gap-2.5">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-display text-base font-semibold text-foreground">
          Degradation Analysis
        </h3>
      </div>

      {/* ── Dark-theme analysis card ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "oklch(0.13 0.018 55)",
          border: "1px solid oklch(0.25 0.03 55)",
          boxShadow: "0 4px 32px oklch(0.08 0.02 55 / 0.4)",
        }}
      >
        {/* Top bar: risk meter + stat pills */}
        <div
          className="px-5 pt-5 pb-4 border-b"
          style={{ borderColor: "oklch(0.22 0.03 55)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Risk score */}
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg
                  viewBox="0 0 56 56"
                  className="w-full h-full -rotate-90"
                  role="img"
                  aria-label={`Risk score: ${riskScore} — ${riskLabel}`}
                >
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    strokeWidth="5"
                    stroke="oklch(0.25 0.03 55)"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    strokeWidth="5"
                    stroke={riskColor}
                    strokeDasharray={`${(riskScore / 100) * 138.2} 138.2`}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 4px ${riskColor})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-xs font-display font-bold"
                    style={{ color: riskColor }}
                  >
                    {riskScore}
                  </span>
                </div>
              </div>
              <div>
                <p
                  className="text-xs font-body"
                  style={{ color: "oklch(0.55 0.025 70)" }}
                >
                  Risk Score
                </p>
                <p
                  className="text-xl font-display font-bold"
                  style={{ color: riskColor }}
                >
                  {riskLabel}
                </p>
                <p
                  className="text-xs font-body mt-0.5"
                  style={{ color: "oklch(0.50 0.02 70)" }}
                >
                  Based on {total} damage {total === 1 ? "record" : "records"}
                </p>
              </div>
            </div>

            {/* Severity pills */}
            <div className="flex gap-2.5 flex-wrap sm:flex-nowrap">
              {[
                {
                  label: "High",
                  value: highVal,
                  color: "oklch(0.52 0.20 25)",
                  dot: "oklch(0.62 0.22 25)",
                  bg: "oklch(0.18 0.04 25)",
                },
                {
                  label: "Medium",
                  value: medVal,
                  color: "oklch(0.75 0.14 80)",
                  dot: "oklch(0.72 0.16 80)",
                  bg: "oklch(0.18 0.03 80)",
                },
                {
                  label: "Low",
                  value: lowVal,
                  color: "oklch(0.72 0.10 230)",
                  dot: "oklch(0.65 0.12 230)",
                  bg: "oklch(0.18 0.03 230)",
                },
              ].map(({ label, value, color, dot, bg }) => (
                <div
                  key={label}
                  className="flex flex-col items-center px-4 py-2.5 rounded-xl min-w-[64px]"
                  style={{ background: bg, border: `1px solid ${dot}22` }}
                >
                  <span
                    className="text-2xl font-display font-bold leading-none"
                    style={{ color }}
                  >
                    {value}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      style={{
                        display: "inline-block",
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: dot,
                      }}
                    />
                    <span
                      className="text-[10px] font-body font-medium"
                      style={{ color: "oklch(0.55 0.025 70)" }}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline graph */}
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p
                className="text-sm font-display font-semibold"
                style={{ color: "oklch(0.88 0.02 70)" }}
              >
                Monthly Damage Timeline
              </p>
              <p
                className="text-xs font-body mt-0.5"
                style={{ color: "oklch(0.50 0.02 70)" }}
              >
                Incident frequency by severity over time
              </p>
            </div>
            {/* Legend */}
            <div className="flex gap-2.5 flex-wrap justify-end">
              {[
                { label: "High", color: "oklch(0.62 0.22 25)" },
                { label: "Medium", color: "oklch(0.72 0.16 80)" },
                { label: "Low", color: "oklch(0.65 0.12 230)" },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    style={{
                      display: "inline-block",
                      width: 20,
                      height: 2,
                      background: color,
                      borderRadius: 2,
                    }}
                  />
                  <span
                    className="text-[11px] font-body"
                    style={{ color: "oklch(0.55 0.025 70)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {hasEnoughForTimeline ? (
            <>
              {/* SVG gradient defs */}
              <svg
                width="0"
                height="0"
                style={{ position: "absolute" }}
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="tl-grad-high" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="oklch(0.52 0.20 25)"
                      stopOpacity={0.55}
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.52 0.20 25)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient
                    id="tl-grad-medium"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="oklch(0.60 0.14 80)"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.60 0.14 80)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient id="tl-grad-low" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="oklch(0.65 0.12 230)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.65 0.12 230)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
              </svg>

              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart
                  data={timelineData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="2 6"
                    stroke="oklch(0.25 0.02 55)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 10,
                      fontFamily: "Cabinet Grotesk, sans-serif",
                      fill: "oklch(0.48 0.02 70)",
                    }}
                    axisLine={{ stroke: "oklch(0.25 0.02 55)" }}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 10,
                      fontFamily: "Cabinet Grotesk, sans-serif",
                      fill: "oklch(0.48 0.02 70)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip content={<TimelineTooltip />} />

                  {latestMonth && (
                    <ReferenceLine
                      x={latestMonth}
                      stroke="oklch(0.55 0.08 42)"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{
                        value: "Now",
                        position: "insideTopRight",
                        fill: "oklch(0.65 0.10 70)",
                        fontSize: 9,
                        fontFamily: "Cabinet Grotesk, sans-serif",
                        fontWeight: 700,
                      }}
                    />
                  )}

                  <Area
                    type="monotoneX"
                    dataKey="low"
                    stroke="oklch(0.65 0.12 230)"
                    strokeWidth={2}
                    fill="url(#tl-grad-low)"
                    dot={{ r: 3, fill: "oklch(0.65 0.12 230)", strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: "oklch(0.65 0.12 230)",
                      strokeWidth: 2,
                      stroke: "oklch(0.13 0.018 55)",
                    }}
                    name="low"
                  />
                  <Area
                    type="monotoneX"
                    dataKey="medium"
                    stroke="oklch(0.72 0.16 80)"
                    strokeWidth={2}
                    fill="url(#tl-grad-medium)"
                    dot={{ r: 3, fill: "oklch(0.72 0.16 80)", strokeWidth: 0 }}
                    activeDot={{
                      r: 5,
                      fill: "oklch(0.72 0.16 80)",
                      strokeWidth: 2,
                      stroke: "oklch(0.13 0.018 55)",
                    }}
                    name="medium"
                  />
                  <Area
                    type="monotoneX"
                    dataKey="high"
                    stroke="oklch(0.62 0.22 25)"
                    strokeWidth={2.5}
                    fill="url(#tl-grad-high)"
                    dot={{
                      r: 3.5,
                      fill: "oklch(0.62 0.22 25)",
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: 5.5,
                      fill: "oklch(0.62 0.22 25)",
                      strokeWidth: 2,
                      stroke: "oklch(0.13 0.018 55)",
                    }}
                    name="high"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div
              className="flex items-center gap-4 rounded-xl px-5 py-5"
              style={{
                background: "oklch(0.18 0.02 55)",
                border: "1px solid oklch(0.28 0.03 55)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.22 0.03 55)" }}
              >
                <BarChart3
                  className="w-5 h-5"
                  style={{ color: "oklch(0.55 0.04 70)" }}
                />
              </div>
              <div>
                <p
                  className="text-sm font-display font-semibold"
                  style={{ color: "oklch(0.82 0.025 70)" }}
                >
                  Not enough data for timeline
                </p>
                <p
                  className="text-xs font-body mt-0.5"
                  style={{ color: "oklch(0.50 0.02 70)" }}
                >
                  Add damage entries across at least 2 different months to see
                  the trend visualized.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom: mini severity bar chart */}
        <div className="px-5 pb-5">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "oklch(0.18 0.02 55)",
              border: "1px solid oklch(0.25 0.03 55)",
            }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p
                className="text-xs font-display font-semibold"
                style={{ color: "oklch(0.70 0.025 70)" }}
              >
                Severity Distribution
              </p>
              <span
                className="text-[11px] font-body"
                style={{ color: "oklch(0.45 0.02 70)" }}
              >
                {total} {total === 1 ? "entry" : "entries"} total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart
                data={severityData}
                barSize={40}
                barCategoryGap="40%"
                margin={{ top: 4, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="2 5"
                  stroke="oklch(0.22 0.02 55)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 11,
                    fontFamily: "Cabinet Grotesk, sans-serif",
                    fill: "oklch(0.50 0.025 70)",
                    fontWeight: 600,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fontFamily: "Cabinet Grotesk, sans-serif",
                    fill: "oklch(0.42 0.02 70)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontFamily: "Cabinet Grotesk, sans-serif",
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid oklch(0.28 0.04 55)",
                    background: "oklch(0.14 0.02 55)",
                    boxShadow: "0 4px 16px oklch(0.08 0.02 55 / 0.5)",
                    color: "oklch(0.85 0.02 70)",
                  }}
                  cursor={{ fill: "oklch(0.22 0.02 55)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DamageLogTab({ structure }: DamageLogTabProps) {
  const { data: entries, isLoading: entriesLoading } = useListDamageEntries(
    structure.id,
  );
  const { data: summary } = useGetDamageSummary(structure.id);
  const { identity, login } = useInternetIdentity();
  const [addOpen, setAddOpen] = useState(false);

  const severityData = summary
    ? [
        {
          name: "Low",
          count: Number(summary.low),
          fill: "oklch(0.65 0.12 230)",
        },
        {
          name: "Medium",
          count: Number(summary.medium),
          fill: "oklch(0.72 0.16 80)",
        },
        {
          name: "High",
          count: Number(summary.high),
          fill: "oklch(0.55 0.22 25)",
        },
      ]
    : [];

  // Compute rich timeline data grouped by month + severity
  const timelineData = useMemo(
    () => groupEntriesByMonthSeverity(entries ?? []),
    [entries],
  );

  const latestMonth =
    timelineData.length > 0
      ? timelineData[timelineData.length - 1].month
      : null;
  const total = (entries ?? []).length;
  const hasEnoughForTimeline = timelineData.length > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Damage Records
          </h3>
          <p className="text-xs text-muted-foreground font-body">
            {total} {total === 1 ? "entry" : "entries"} recorded
          </p>
        </div>
        {identity ? (
          <Button
            data-ocid="damage.add_button"
            onClick={() => setAddOpen(true)}
            className="bg-terracotta hover:bg-terracotta-dark text-white gap-2 h-9 font-body"
          >
            <Plus className="w-4 h-4" />
            Add Damage Entry
          </Button>
        ) : (
          <div
            className="flex items-center gap-2"
            data-ocid="damage.sign_in_notice"
          >
            <LogIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground font-body">
              Sign in to log damage entries
            </span>
            <Button
              data-ocid="damage.sign_in_button"
              variant="outline"
              size="sm"
              onClick={() => login()}
              className="h-8 px-3 font-body text-xs border-border hover:bg-muted/60"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>

      {/* Degradation Analysis Section */}
      {!entriesLoading && entries && entries.length > 0 && (
        <DegradationAnalysisPanel
          timelineData={timelineData}
          hasEnoughForTimeline={hasEnoughForTimeline}
          latestMonth={latestMonth}
          severityData={severityData}
          total={total}
          summary={summary}
        />
      )}

      {/* Entries list */}
      {entriesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <div
          data-ocid="damage.empty_state"
          className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-lg"
        >
          <BarChart3 className="w-8 h-8 text-muted-foreground mb-3" />
          <h4 className="font-display text-base font-semibold text-foreground mb-1">
            No damage entries yet
          </h4>
          <p className="text-sm text-muted-foreground font-body max-w-xs">
            Document observed damage to build a historical record for this
            structure.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {[...entries]
              .sort((a, b) => Number(b.date) - Number(a.date))
              .map((entry, idx) => (
                <DamageEntryRow
                  key={entry.id}
                  entry={entry}
                  index={idx + 1}
                  structureId={structure.id}
                />
              ))}
          </AnimatePresence>
        </div>
      )}

      <AddDamageDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        structureId={structure.id}
      />
    </div>
  );
}

function DamageEntryRow({
  entry,
  index,
  structureId,
}: {
  entry: DamageEntry;
  index: number;
  structureId: string;
}) {
  const { mutate: deleteEntry, isPending } = useDeleteDamageEntry();

  function handleDelete() {
    deleteEntry(
      { id: entry.id, structureId },
      {
        onSuccess: () => toast.success("Damage entry removed"),
        onError: () => toast.error("Failed to remove entry"),
      },
    );
  }

  return (
    <motion.div
      data-ocid={`damage.item.${index}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="bg-card border border-border rounded-lg p-4 shadow-xs flex items-start gap-3"
    >
      {/* Severity indicator dot */}
      <div className="mt-0.5 flex-shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full mt-1"
          style={{
            background:
              entry.severity === "high"
                ? "oklch(0.55 0.22 25)"
                : entry.severity === "medium"
                  ? "oklch(0.72 0.16 80)"
                  : "oklch(0.65 0.12 230)",
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border font-body ${getCategoryClass(entry.category as string)}`}
          >
            {(entry.category as string).charAt(0).toUpperCase() +
              (entry.category as string).slice(1)}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border font-body ${getSeverityClass(entry.severity as string)}`}
          >
            {(entry.severity as string).charAt(0).toUpperCase() +
              (entry.severity as string).slice(1)}{" "}
            severity
          </span>
          <span className="text-xs text-muted-foreground font-body ml-auto">
            {formatDate(entry.date)}
          </span>
        </div>

        <p className="text-sm text-foreground font-body leading-relaxed">
          {entry.description}
        </p>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            data-ocid={`damage.delete_button.${index}`}
            variant="ghost"
            size="icon"
            disabled={isPending}
            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent data-ocid="damage.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete damage entry?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm">
              This will permanently remove this damage record. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="damage.cancel_button"
              className="font-body"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="damage.confirm_button"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-body"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function AddDamageDialog({
  open,
  onOpenChange,
  structureId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structureId: string;
}) {
  const { mutate: addEntry, isPending } = useAddDamageEntry();
  const { identity } = useInternetIdentity();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<DamageCategory>(
    DamageCategory.general,
  );
  const [severity, setSeverity] = useState<DamageSeverity>(DamageSeverity.low);
  const [description, setDescription] = useState("");

  function handleClose() {
    if (isPending) return;
    onOpenChange(false);
    setDate(new Date().toISOString().split("T")[0]);
    setCategory(DamageCategory.general);
    setSeverity(DamageSeverity.low);
    setDescription("");
  }

  function handleSubmit() {
    if (!identity) {
      toast.error("Please sign in to add damage entries");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    const callerPrincipal = identity.getPrincipal();

    const dateMs = new Date(date).getTime();

    addEntry(
      {
        id: crypto.randomUUID(),
        structureId,
        date: BigInt(dateMs),
        description: description.trim(),
        recordedAt: BigInt(Date.now()),
        recordedBy: callerPrincipal,
        category,
        severity,
      },
      {
        onSuccess: () => {
          toast.success("Damage entry added");
          handleClose();
        },
        onError: (err) => {
          if (
            err.message?.includes("Unauthorized") ||
            err.message?.includes("unauthorized")
          ) {
            toast.error("You must be signed in to add damage entries");
          } else {
            toast.error(`Failed to save entry: ${err.message}`);
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-ocid="damage.add_dialog" className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Add Damage Entry
          </DialogTitle>
          <DialogDescription className="font-body text-sm">
            Document observed damage, its category, and assessed severity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label
              htmlFor="damage-date"
              className="font-body text-sm font-medium"
            >
              Observation Date
            </Label>
            <Input
              id="damage-date"
              data-ocid="damage.date_input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-9 font-body"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-body text-sm font-medium">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as DamageCategory)}
              >
                <SelectTrigger
                  data-ocid="damage.category_select"
                  className="mt-1 h-9 font-body text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value={DamageCategory.foundation}
                    className="font-body text-sm"
                  >
                    Foundation
                  </SelectItem>
                  <SelectItem
                    value={DamageCategory.walls}
                    className="font-body text-sm"
                  >
                    Walls
                  </SelectItem>
                  <SelectItem
                    value={DamageCategory.roof}
                    className="font-body text-sm"
                  >
                    Roof
                  </SelectItem>
                  <SelectItem
                    value={DamageCategory.general}
                    className="font-body text-sm"
                  >
                    General
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-body text-sm font-medium">Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as DamageSeverity)}
              >
                <SelectTrigger
                  data-ocid="damage.severity_select"
                  className="mt-1 h-9 font-body text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value={DamageSeverity.low}
                    className="font-body text-sm"
                  >
                    Low
                  </SelectItem>
                  <SelectItem
                    value={DamageSeverity.medium}
                    className="font-body text-sm"
                  >
                    Medium
                  </SelectItem>
                  <SelectItem
                    value={DamageSeverity.high}
                    className="font-body text-sm"
                  >
                    High
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label
              htmlFor="damage-desc"
              className="font-body text-sm font-medium"
            >
              Description
            </Label>
            <Textarea
              id="damage-desc"
              data-ocid="damage.description_textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the observed damage in detail…"
              rows={4}
              className="mt-1 font-body text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="damage.cancel_button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            className="font-body"
          >
            Cancel
          </Button>
          <Button
            data-ocid="damage.submit_button"
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-terracotta hover:bg-terracotta-dark text-white font-body"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save Entry"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

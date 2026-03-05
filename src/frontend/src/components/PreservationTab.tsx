import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplets,
  Shield,
  Star,
  Sun,
  TreePine,
  Wrench,
  Zap,
} from "lucide-react";
import { AnimatePresence, type Variants, motion } from "motion/react";
import { useState } from "react";
import type { DamageEntry, Structure } from "../backend.d";
import { DamageCategory } from "../backend.d";
import {
  useListDamageEntries,
  usePreservationRecommendations,
} from "../hooks/useQueries";
import { averageCondition } from "../utils/heritage";
import {
  type ScheduleFrequency,
  buildMaintenanceSchedule,
  generatePreservationPlan,
} from "../utils/preservationPlan";

// ── Category Meta ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<
  DamageCategory,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    headerBg: string;
    badgeBg: string;
    dotColor: string;
    borderColor: string;
  }
> = {
  [DamageCategory.foundation]: {
    label: "Foundation",
    icon: Shield,
    headerBg: "bg-stone-800/5 border-stone-300",
    badgeBg: "bg-stone-100 text-stone-800 border-stone-300",
    dotColor: "bg-stone-600",
    borderColor: "border-stone-300",
  },
  [DamageCategory.walls]: {
    label: "Walls",
    icon: Wrench,
    headerBg: "bg-amber-50 border-amber-200",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
    dotColor: "bg-amber-600",
    borderColor: "border-amber-200",
  },
  [DamageCategory.roof]: {
    label: "Roof",
    icon: Sun,
    headerBg: "bg-orange-50 border-orange-200",
    badgeBg: "bg-orange-100 text-orange-800 border-orange-300",
    dotColor: "bg-orange-500",
    borderColor: "border-orange-200",
  },
  [DamageCategory.general]: {
    label: "General Site",
    icon: TreePine,
    headerBg: "bg-emerald-50 border-emerald-200",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dotColor: "bg-emerald-600",
    borderColor: "border-emerald-200",
  },
};

const ROADMAP_ICONS = [Shield, Wrench, Droplets, Star];

const SCHEDULE_COLORS: Record<ScheduleFrequency, string> = {
  Daily: "bg-red-50 text-red-800 border-red-200",
  Weekly: "bg-orange-50 text-orange-800 border-orange-200",
  Monthly: "bg-amber-50 text-amber-800 border-amber-200",
  Quarterly: "bg-yellow-50 text-yellow-800 border-yellow-200",
  Annual: "bg-green-50 text-green-800 border-green-200",
  "5-Yearly": "bg-blue-50 text-blue-800 border-blue-200",
  "As needed": "bg-stone-50 text-stone-700 border-stone-200",
};

const TIER_CONFIG = {
  Emergency: {
    bg: "bg-red-50 border-red-300",
    badge: "bg-red-600 text-white",
    bar: "bg-red-500",
    icon: AlertTriangle,
    iconColor: "text-red-600",
    textColor: "text-red-900",
    subColor: "text-red-700",
  },
  Corrective: {
    bg: "bg-amber-50 border-amber-300",
    badge: "bg-amber-500 text-white",
    bar: "bg-amber-500",
    icon: Zap,
    iconColor: "text-amber-600",
    textColor: "text-amber-900",
    subColor: "text-amber-700",
  },
  Preventive: {
    bg: "bg-emerald-50 border-emerald-300",
    badge: "bg-emerald-600 text-white",
    bar: "bg-emerald-500",
    icon: CheckCircle,
    iconColor: "text-emerald-600",
    textColor: "text-emerald-900",
    subColor: "text-emerald-700",
  },
};

// ── Stagger variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────

interface TaskGroupCardProps {
  label: string;
  frequency: string;
  tasks: string[];
  requiresSpecialist: boolean;
  dotColor: string;
  index: number;
}

function TaskGroupCard({
  label,
  frequency,
  tasks,
  requiresSpecialist,
  dotColor,
  index,
}: TaskGroupCardProps) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          <span
            className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)}
          />
          <span className="font-display text-sm font-semibold text-foreground truncate">
            {label}
          </span>
          <span className="hidden sm:inline text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded flex-shrink-0">
            {frequency}
          </span>
          {requiresSpecialist && (
            <span className="hidden sm:inline text-xs font-body bg-terracotta/10 text-terracotta border border-terracotta/20 px-1.5 py-0.5 rounded flex-shrink-0">
              Specialist
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              <div className="flex flex-wrap gap-2 mb-3 sm:hidden">
                <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                  {frequency}
                </span>
                {requiresSpecialist && (
                  <span className="text-xs font-body bg-terracotta/10 text-terracotta border border-terracotta/20 px-1.5 py-0.5 rounded">
                    Requires Specialist
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li
                    key={task}
                    className="flex items-start gap-2.5 text-sm text-foreground font-body leading-relaxed"
                  >
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-terracotta flex-shrink-0" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CategoryCardProps {
  category: DamageCategory;
  structure: Structure;
  entries: DamageEntry[];
  index: number;
}

function CategoryCard({
  category,
  structure,
  entries,
  index,
}: CategoryCardProps) {
  const { data: recommendation, isLoading } =
    usePreservationRecommendations(category);
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  const plan = generatePreservationPlan(structure, entries).categoryPlans[
    category
  ];

  return (
    <motion.div
      variants={cardVariants}
      data-ocid={`preservation.category_card.${index + 1}`}
      className={cn(
        "border rounded-xl overflow-hidden shadow-xs",
        meta.borderColor,
      )}
    >
      {/* Card header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          meta.headerBg,
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/60 border border-white/40 flex items-center justify-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <h4 className="font-display text-sm font-semibold text-foreground">
            {meta.label} Maintenance Plan
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-mono font-bold px-2 py-0.5 rounded border",
              meta.badgeBg,
            )}
          >
            {plan.conditionPct}%
          </span>
          <div className="hidden sm:flex items-center gap-1">
            <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  plan.conditionPct >= 75
                    ? "bg-emerald-500"
                    : plan.conditionPct >= 50
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
                style={{ width: `${plan.conditionPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation paragraph */}
      <div className="px-4 pt-4 pb-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        ) : recommendation ? (
          <p className="text-sm font-body text-muted-foreground leading-relaxed italic border-l-2 border-terracotta/30 pl-3">
            {recommendation}
          </p>
        ) : null}
      </div>

      {/* Task groups */}
      <div className="px-4 pb-4 space-y-2 mt-2">
        {plan.taskGroups.map((group, i) => (
          <TaskGroupCard
            key={group.label}
            label={group.label}
            frequency={group.frequency}
            tasks={group.tasks}
            requiresSpecialist={group.requiresSpecialist}
            dotColor={meta.dotColor}
            index={i}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

interface PreservationTabProps {
  structure: Structure;
}

export function PreservationTab({ structure }: PreservationTabProps) {
  const { data: entries = [] } = useListDamageEntries(structure.id);

  const plan = generatePreservationPlan(structure, entries);
  const schedule = buildMaintenanceSchedule(plan);
  const tierConfig = TIER_CONFIG[plan.maintenanceTier];
  const TierIcon = tierConfig.icon;

  const avgCond = Math.round(averageCondition(structure.currentCondition));

  // Determine which categories to show
  const affectedCategories = [
    ...new Set(entries.map((e) => e.category as DamageCategory)),
  ];
  const categoriesToShow: DamageCategory[] =
    affectedCategories.length > 0
      ? affectedCategories
      : Object.values(DamageCategory);

  const scheduleFrequencies: ScheduleFrequency[] = [
    "Daily",
    "Weekly",
    "Monthly",
    "Quarterly",
    "Annual",
    "5-Yearly",
  ];

  return (
    <div className="space-y-8">
      {/* ── 1. Maintenance Tier Banner ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        data-ocid="preservation.tier_banner"
        className={cn("border-2 rounded-xl p-5 shadow-stone", tierConfig.bg)}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 flex-shrink-0",
              )}
            >
              <TierIcon className={cn("w-5 h-5", tierConfig.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Maintenance Tier
                </span>
                <span
                  className={cn(
                    "text-xs font-mono font-bold px-2.5 py-1 rounded-full",
                    tierConfig.badge,
                  )}
                >
                  {plan.maintenanceTier}
                </span>
              </div>
              <p
                className={cn(
                  "text-sm font-body leading-relaxed",
                  tierConfig.subColor,
                )}
              >
                {plan.tierReason}
              </p>
            </div>
          </div>

          {/* Condition meter */}
          <div className="sm:w-44 flex-shrink-0 bg-white/50 rounded-lg p-3 border border-white/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-display font-semibold text-muted-foreground">
                Overall Condition
              </span>
              <span
                className={cn(
                  "text-sm font-mono font-bold",
                  tierConfig.iconColor,
                )}
              >
                {avgCond}%
              </span>
            </div>
            <div className="h-2 bg-white/70 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${avgCond}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                className={cn("h-full rounded-full", tierConfig.bar)}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1">
              {(["Foundation", "Walls", "Roof"] as const).map((label, i) => {
                const val = [
                  Number(structure.currentCondition.foundation),
                  Number(structure.currentCondition.walls),
                  Number(structure.currentCondition.roof),
                ][i];
                return (
                  <div key={label} className="text-center">
                    <div className="text-xs font-mono font-bold text-foreground">
                      {val}%
                    </div>
                    <div className="text-[10px] text-muted-foreground font-body">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Urgency Timeline Strip ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        data-ocid="preservation.urgency_strip"
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-terracotta" />
          <h3 className="font-display text-base font-semibold text-foreground">
            Urgency Timeline — {structure.name}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Immediate */}
          <div className="rounded-xl border-2 border-red-200 bg-red-50 overflow-hidden">
            <div className="bg-red-600 px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-display font-bold text-white uppercase tracking-wide">
                Immediate
              </span>
              <span className="text-[10px] text-red-200 font-mono ml-auto">
                0–3 months
              </span>
            </div>
            <div className="p-3 space-y-2">
              {plan.urgencyBuckets.immediate.length > 0 ? (
                plan.urgencyBuckets.immediate.map((item) => (
                  <p
                    key={item}
                    className="text-xs font-body text-red-900 leading-snug flex items-start gap-1.5"
                  >
                    <span className="mt-1 w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-xs text-red-700 font-body italic">
                  No immediate actions required.
                </p>
              )}
            </div>
          </div>

          {/* Short-term */}
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 overflow-hidden">
            <div className="bg-amber-500 px-3 py-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-display font-bold text-white uppercase tracking-wide">
                Short-Term
              </span>
              <span className="text-[10px] text-amber-100 font-mono ml-auto">
                3–12 months
              </span>
            </div>
            <div className="p-3 space-y-2">
              {plan.urgencyBuckets.shortTerm.length > 0 ? (
                plan.urgencyBuckets.shortTerm.map((item) => (
                  <p
                    key={item}
                    className="text-xs font-body text-amber-900 leading-snug flex items-start gap-1.5"
                  >
                    <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-xs text-amber-700 font-body italic">
                  No short-term actions required.
                </p>
              )}
            </div>
          </div>

          {/* Long-term */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 overflow-hidden">
            <div className="bg-emerald-600 px-3 py-2 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-display font-bold text-white uppercase tracking-wide">
                Long-Term
              </span>
              <span className="text-[10px] text-emerald-200 font-mono ml-auto">
                1+ years
              </span>
            </div>
            <div className="p-3 space-y-2">
              {plan.urgencyBuckets.longTerm.length > 0 ? (
                plan.urgencyBuckets.longTerm.map((item) => (
                  <p
                    key={item}
                    className="text-xs font-body text-emerald-900 leading-snug flex items-start gap-1.5"
                  >
                    <span className="mt-1 w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-xs text-emerald-700 font-body italic">
                  No long-term actions required.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 3. Per-Category Maintenance Plans ─────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-terracotta" />
          <h3 className="font-display text-base font-semibold text-foreground">
            Detailed Maintenance Plans by Category
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {categoriesToShow.map((category, index) => (
            <CategoryCard
              key={category}
              category={category}
              structure={structure}
              entries={entries}
              index={index}
            />
          ))}
        </motion.div>
      </div>

      {/* ── 4. Structure-Specific Roadmap ─────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-terracotta" />
          <h3 className="font-display text-base font-semibold text-foreground">
            Preservation Roadmap for {structure.name}
          </h3>
        </div>
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-terracotta/20 hidden sm:block" />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-5"
          >
            {plan.roadmapPhases.map((phase, idx) => {
              const PhaseIcon = ROADMAP_ICONS[idx] ?? Shield;
              return (
                <motion.div
                  key={phase.phase}
                  variants={cardVariants}
                  className="sm:pl-11 relative"
                  data-ocid={`preservation.roadmap.${idx + 1}`}
                >
                  {/* Timeline dot */}
                  <div className="hidden sm:flex absolute left-0 top-3 w-8 h-8 rounded-full bg-card border-2 border-terracotta items-center justify-center shadow-xs">
                    <PhaseIcon className="w-3.5 h-3.5 text-terracotta" />
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5 shadow-xs hover:shadow-stone transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-terracotta bg-terracotta/10 px-2 py-0.5 rounded border border-terracotta/20">
                          {phase.phase}
                        </span>
                        <h4 className="font-display text-sm font-bold text-foreground">
                          {phase.title}
                        </h4>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-mono flex-shrink-0 border-border"
                      >
                        {phase.timeline}
                      </Badge>
                    </div>
                    <ul className="space-y-2">
                      {phase.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-sm font-body text-foreground leading-relaxed"
                        >
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-terracotta flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* ── 5. Maintenance Schedule Summary ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        data-ocid="preservation.schedule_summary"
        className="bg-card border border-border rounded-xl overflow-hidden shadow-xs"
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-terracotta" />
          <h3 className="font-display text-sm font-bold text-foreground">
            Maintenance Schedule Summary
          </h3>
          <span className="text-xs text-muted-foreground font-body ml-1">
            — all task groups consolidated by frequency
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduleFrequencies.map((freq) => {
            const items = schedule[freq];
            if (items.length === 0) return null;
            return (
              <div
                key={freq}
                className={cn("rounded-lg border p-3.5", SCHEDULE_COLORS[freq])}
              >
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                  <span className="text-xs font-display font-bold uppercase tracking-wider">
                    {freq}
                  </span>
                  <span className="ml-auto text-xs font-mono opacity-70">
                    {items.length}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li
                      key={item.task}
                      className="text-xs font-body leading-snug flex items-start gap-1.5 opacity-90"
                    >
                      <span className="mt-1 flex-shrink-0">
                        {item.requiresSpecialist ? "★" : "·"}
                      </span>
                      {item.task}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-muted/40 border-t border-border flex items-center gap-3 text-xs font-body text-muted-foreground">
          <span className="flex items-center gap-1">
            <span>★</span> Requires specialist contractor
          </span>
          <span className="flex items-center gap-1">
            <span>·</span> Can be performed by site custodian
          </span>
        </div>
      </motion.div>
    </div>
  );
}

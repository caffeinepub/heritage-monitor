import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Building2,
  Calendar,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Structure } from "../backend.d";
import { AddStructureDialog } from "../components/AddStructureDialog";
import { useListStructures } from "../hooks/useQueries";
import {
  averageCondition,
  getConditionBadgeClass,
  getConditionLabel,
  overallConditionLevel,
} from "../utils/heritage";

interface DashboardProps {
  onSelectStructure: (id: string) => void;
}

export function Dashboard({ onSelectStructure }: DashboardProps) {
  const { data: structures, isLoading } = useListStructures();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = (structures ?? []).filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.era.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-1">
            Heritage Structures
          </h1>
          <p className="text-muted-foreground text-sm font-body">
            Monitor, document, and preserve cultural heritage for future
            generations
          </p>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            data-ocid="dashboard.search_input"
            placeholder="Search by name, location or era…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card border-border font-body text-sm"
          />
        </div>

        <Button
          data-ocid="dashboard.add_structure_button"
          onClick={() => setAddOpen(true)}
          className="bg-terracotta hover:bg-terracotta-dark text-white gap-2 h-9 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Structure
        </Button>
      </div>

      {/* Stats bar */}
      {!isLoading && structures && structures.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          {[
            {
              label: "Total Structures",
              value: structures.length,
              icon: Building2,
            },
            {
              label: "Good Condition",
              value: structures.filter(
                (s) => overallConditionLevel(s.currentCondition) === "good",
              ).length,
              icon: Building2,
              color: "text-green-700",
            },
            {
              label: "Need Attention",
              value: structures.filter((s) => {
                const lvl = overallConditionLevel(s.currentCondition);
                return lvl === "poor" || lvl === "critical";
              }).length,
              icon: AlertTriangle,
              color: "text-orange-700",
            },
            {
              label: "Historical Eras",
              value: new Set(structures.map((s) => s.era)).size,
              icon: Calendar,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg px-4 py-3 shadow-xs"
            >
              <p className="text-xs text-muted-foreground font-body mb-0.5">
                {stat.label}
              </p>
              <p
                className={`text-2xl font-display font-bold ${stat.color ?? "text-foreground"}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
            <Skeleton key={k} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="dashboard.empty_state"
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-stone-100 border border-border flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">
            {search ? "No matching structures" : "No structures yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs font-body">
            {search
              ? "Try adjusting your search terms."
              : "Add your first heritage structure to begin monitoring its condition."}
          </p>
          {!search && (
            <Button
              onClick={() => setAddOpen(true)}
              className="mt-5 bg-terracotta hover:bg-terracotta-dark text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Structure
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          <AnimatePresence>
            {filtered.map((structure, idx) => (
              <StructureCard
                key={structure.id}
                structure={structure}
                index={idx + 1}
                onClick={() => onSelectStructure(structure.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AddStructureDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function StructureCard({
  structure,
  index,
  onClick,
}: {
  structure: Structure;
  index: number;
  onClick: () => void;
}) {
  const level = overallConditionLevel(structure.currentCondition);
  const avg = averageCondition(structure.currentCondition);
  const badgeClass = getConditionBadgeClass(level);

  const degradation = Math.max(
    0,
    averageCondition(structure.originalCondition) - avg,
  );

  return (
    <motion.div
      data-ocid={`dashboard.structure_card.${index}`}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
      }}
      layout
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left bg-card border border-border rounded-lg shadow-xs hover:shadow-stone transition-shadow duration-200 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Condition accent line */}
        <div
          className="h-1 w-full"
          style={{
            background:
              level === "good"
                ? "oklch(0.65 0.15 145)"
                : level === "fair"
                  ? "oklch(0.72 0.16 80)"
                  : level === "poor"
                    ? "oklch(0.65 0.18 50)"
                    : "oklch(0.55 0.22 25)",
          }}
        />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground truncate group-hover:text-terracotta transition-colors">
                {structure.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-xs font-body">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{structure.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Condition urgency indicator */}
              <div
                className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  level === "critical"
                    ? "border-red-500 bg-red-50 animate-pulse"
                    : level === "poor"
                      ? "border-orange-400 bg-orange-50"
                      : level === "fair"
                        ? "border-amber-400 bg-amber-50"
                        : "border-green-500 bg-green-50"
                }`}
                title={`${getConditionLabel(level)} condition`}
                aria-label={`Condition: ${getConditionLabel(level)}`}
              >
                {level === "critical" || level === "poor" ? (
                  <AlertTriangle
                    className={`w-4 h-4 ${level === "critical" ? "text-red-500" : "text-orange-500"}`}
                  />
                ) : (
                  <Building2
                    className={`w-4 h-4 ${level === "fair" ? "text-amber-500" : "text-green-600"}`}
                  />
                )}
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border font-body ${badgeClass}`}
              >
                {getConditionLabel(level)}
              </span>
            </div>
          </div>

          {/* Condition bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-body mb-1">
              <span>Overall Condition</span>
              <span className="font-mono">{Math.round(avg)}%</span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${avg}%`,
                  background:
                    level === "good"
                      ? "oklch(0.65 0.15 145)"
                      : level === "fair"
                        ? "oklch(0.72 0.16 80)"
                        : level === "poor"
                          ? "oklch(0.65 0.18 50)"
                          : "oklch(0.55 0.22 25)",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
              <Calendar className="w-3 h-3" />
              <span>{structure.era}</span>
            </div>
            {degradation > 1 && (
              <div className="flex items-center gap-1 text-xs text-orange-600 font-body">
                <AlertTriangle className="w-3 h-3" />
                <span>−{Math.round(degradation)}% degraded</span>
              </div>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

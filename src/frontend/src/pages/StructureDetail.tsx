import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { DamageLogTab } from "../components/DamageLogTab";
import { OverviewTab } from "../components/OverviewTab";
import { PreservationTab } from "../components/PreservationTab";
import { useGetStructure } from "../hooks/useQueries";

interface StructureDetailProps {
  structureId: string;
  onBack: () => void;
}

export function StructureDetail({ structureId, onBack }: StructureDetailProps) {
  const { data: structure, isLoading, isError } = useGetStructure(structureId);

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-destructive font-body">Failed to load structure.</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back button */}
      <Button
        data-ocid="structure.back_button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4 text-muted-foreground hover:text-foreground gap-1.5 h-8 -ml-2 font-body"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All Structures
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-64 w-full rounded-xl mt-6" />
        </div>
      ) : structure ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6 bg-stone-100 border border-border h-10">
              <TabsTrigger
                data-ocid="structure.overview_tab"
                value="overview"
                className="font-body text-sm data-[state=active]:bg-card data-[state=active]:text-terracotta data-[state=active]:shadow-xs"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                data-ocid="structure.damage_tab"
                value="damage"
                className="font-body text-sm data-[state=active]:bg-card data-[state=active]:text-terracotta data-[state=active]:shadow-xs"
              >
                Damage Log
              </TabsTrigger>
              <TabsTrigger
                data-ocid="structure.preservation_tab"
                value="preservation"
                className="font-body text-sm data-[state=active]:bg-card data-[state=active]:text-terracotta data-[state=active]:shadow-xs"
              >
                Preservation Guide
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab structure={structure} />
            </TabsContent>
            <TabsContent value="damage">
              <DamageLogTab structure={structure} />
            </TabsContent>
            <TabsContent value="preservation">
              <PreservationTab structure={structure} />
            </TabsContent>
          </Tabs>
        </motion.div>
      ) : null}
    </div>
  );
}

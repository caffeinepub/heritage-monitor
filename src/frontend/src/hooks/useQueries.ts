import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DamageCategory, DamageEntry, Structure } from "../backend.d";
import { useActor } from "./useActor";

// ── Structure Queries ──────────────────────────────────────────────────────

export function useListStructures() {
  const { actor } = useActor();
  return useQuery<Structure[]>({
    queryKey: ["structures"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listStructures();
    },
    enabled: !!actor,
    refetchInterval: 10000,
  });
}

export function useGetStructure(id: string) {
  const { actor } = useActor();
  return useQuery<Structure>({
    queryKey: ["structure", id],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getStructure(id);
    },
    enabled: !!actor && !!id,
    refetchInterval: 10000,
  });
}

export function useAddStructure() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (structure: Structure) => {
      if (!actor) throw new Error("No actor");
      return actor.addStructure(structure);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["structures"] });
    },
  });
}

export function useUpdateStructure() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (structure: Structure) => {
      if (!actor) throw new Error("No actor");
      return actor.updateStructure(structure);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["structures"] });
      queryClient.invalidateQueries({ queryKey: ["structure", variables.id] });
    },
  });
}

export function useDeleteStructure() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteStructure(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["structures"] });
    },
  });
}

// ── Damage Entry Queries ───────────────────────────────────────────────────

export function useListDamageEntries(structureId: string) {
  const { actor } = useActor();
  return useQuery<DamageEntry[]>({
    queryKey: ["damageEntries", structureId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDamageEntriesByStructure(structureId);
    },
    enabled: !!actor && !!structureId,
    refetchInterval: 10000,
  });
}

export function useGetDamageSummary(structureId: string) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["damageSummary", structureId],
    queryFn: async () => {
      if (!actor) return { low: 0n, medium: 0n, high: 0n };
      return actor.getDamageSummary(structureId);
    },
    enabled: !!actor && !!structureId,
    refetchInterval: 10000,
  });
}

export function useAddDamageEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: DamageEntry) => {
      if (!actor) throw new Error("No actor");
      return actor.addDamageEntry(entry);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["damageEntries", variables.structureId],
      });
      queryClient.invalidateQueries({
        queryKey: ["damageSummary", variables.structureId],
      });
    },
  });
}

export function useDeleteDamageEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string;
      structureId: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteDamageEntry(id);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["damageEntries", variables.structureId],
      });
      queryClient.invalidateQueries({
        queryKey: ["damageSummary", variables.structureId],
      });
    },
  });
}

// ── Preservation Queries ───────────────────────────────────────────────────

export function usePreservationRecommendations(
  category: DamageCategory | null,
) {
  const { actor } = useActor();
  return useQuery<string>({
    queryKey: ["preservation", category],
    queryFn: async () => {
      if (!actor || !category) return "";
      return actor.getPreservationRecommendations(category);
    },
    enabled: !!actor && !!category,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

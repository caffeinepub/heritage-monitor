import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { HttpAgent } from "@icp-sdk/core/agent";
import {
  AlertTriangle,
  Calendar,
  Camera,
  Loader2,
  MapPin,
  Minus,
  Pencil,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ConditionStatus, ImageDefect, Structure } from "../backend.d";
import { loadConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { useBlobStorage } from "../hooks/useBlobStorage";
import type { UploadedPhoto } from "../hooks/useBlobStorage";
import {
  type DetectedDefect,
  analyzeImageForDefects,
} from "../hooks/useImageDefectAnalysis";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUpdateStructure } from "../hooks/useQueries";
import { StorageClient } from "../utils/StorageClient";
import {
  averageCondition,
  getConditionBadgeClass,
  getConditionLabel,
  getConditionLevel,
  overallConditionLevel,
} from "../utils/heritage";
import { CameraModal } from "./CameraModal";

interface OverviewTabProps {
  structure: Structure;
}

type PhotoAnalysisState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "done"; defects: DetectedDefect[] }
  | { status: "error"; message: string };

function getSeverityColor(severity: DetectedDefect["severity"]) {
  if (severity === "high") return "bg-red-100 text-red-700 border-red-200";
  if (severity === "medium")
    return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-600 border-green-200";
}

function getDefectBadgeStyle(defects: DetectedDefect[]): string {
  if (defects.some((d) => d.severity === "high"))
    return "bg-red-500 text-white";
  if (defects.some((d) => d.severity === "medium"))
    return "bg-amber-500 text-white";
  return "bg-stone-400 text-white";
}

// ── EditConditionDialog ─────────────────────────────────────────────────────

interface EditConditionDialogProps {
  structure: Structure;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditConditionDialog({
  structure,
  open,
  onOpenChange,
}: EditConditionDialogProps) {
  const { mutate: updateStructure, isPending } = useUpdateStructure();

  const [foundation, setFoundation] = useState(
    Number(structure.currentCondition.foundation),
  );
  const [walls, setWalls] = useState(Number(structure.currentCondition.walls));
  const [roof, setRoof] = useState(Number(structure.currentCondition.roof));

  // Sync slider defaults when dialog opens or structure changes
  useEffect(() => {
    if (open) {
      setFoundation(Number(structure.currentCondition.foundation));
      setWalls(Number(structure.currentCondition.walls));
      setRoof(Number(structure.currentCondition.roof));
    }
  }, [open, structure]);

  function handleClose() {
    if (isPending) return;
    onOpenChange(false);
  }

  function handleSave() {
    updateStructure(
      {
        ...structure,
        currentCondition: {
          foundation: BigInt(foundation),
          walls: BigInt(walls),
          roof: BigInt(roof),
        },
      },
      {
        onSuccess: () => {
          toast.success("Condition updated");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(`Failed to update condition: ${err.message}`);
        },
      },
    );
  }

  const sliders: Array<{
    key: "foundation" | "walls" | "roof";
    label: string;
    value: number;
    onChange: (v: number) => void;
  }> = [
    {
      key: "foundation",
      label: "Foundation",
      value: foundation,
      onChange: setFoundation,
    },
    { key: "walls", label: "Walls", value: walls, onChange: setWalls },
    { key: "roof", label: "Roof", value: roof, onChange: setRoof },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-ocid="edit_condition.dialog"
        className="max-w-md bg-card"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Edit Current Condition
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {sliders.map(({ key, label, value, onChange }) => {
            const color =
              value >= 75
                ? "oklch(0.65 0.15 145)"
                : value >= 50
                  ? "oklch(0.72 0.16 80)"
                  : value >= 25
                    ? "oklch(0.65 0.18 50)"
                    : "oklch(0.55 0.22 25)";

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="font-body text-sm font-medium text-foreground">
                    {label}
                  </Label>
                  <span
                    className="text-sm font-mono font-semibold"
                    style={{ color }}
                  >
                    {value}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[value]}
                  onValueChange={([v]) => onChange(v)}
                  className="w-full"
                  data-ocid={`edit_condition.${key}_input`}
                />
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="edit_condition.cancel_button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            className="font-body"
          >
            Cancel
          </Button>
          <Button
            data-ocid="edit_condition.save_button"
            onClick={handleSave}
            disabled={isPending}
            className="bg-terracotta hover:bg-terracotta-dark text-white font-body"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OverviewTab({ structure }: OverviewTabProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editConditionOpen, setEditConditionOpen] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<
    Record<string, PhotoAnalysisState>
  >({});
  // Track "structureId + actorPrincipal" so photos reload after login/logout or structure change
  const photosLoadedRef = useRef<string | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadPhoto, isUploading, uploadProgress, uploadError } =
    useBlobStorage();
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  // Reset photos state when the structure changes so we don't show stale data
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only when structure.id changes
  useEffect(() => {
    setPhotos([]);
    setPhotoAnalysis({});
    photosLoadedRef.current = null;
  }, [structure.id]);

  // Load saved photos from backend whenever actor becomes available or structure changes.
  // Use a composite key so photos reload after login/logout (actor principal changes).
  useEffect(() => {
    if (!actor || actorFetching) return;
    const cacheKey = `${structure.id}`;
    // Already loaded for this exact structure + actor combo in this session
    if (photosLoadedRef.current === cacheKey) return;

    async function loadSavedPhotos() {
      if (!actor) return;
      photosLoadedRef.current = cacheKey;
      setLoadingPhotos(true);
      try {
        const savedDefects = await actor.getImageDefectsByStructure(
          structure.id,
        );
        if (savedDefects.length === 0) {
          setLoadingPhotos(false);
          return;
        }

        // Group defects by photoHash
        const byHash: Record<string, ImageDefect[]> = {};
        for (const defect of savedDefects) {
          if (!byHash[defect.photoHash]) byHash[defect.photoHash] = [];
          byHash[defect.photoHash].push(defect);
        }

        // Build StorageClient for URL resolution
        const config = await loadConfig();
        const agent = await HttpAgent.create({});
        const storageClient = new StorageClient(
          "photos",
          config.storage_gateway_url || "",
          config.backend_canister_id || "",
          config.project_id || "",
          agent,
        );

        // Resolve URLs for each unique hash in parallel
        const hashes = Object.keys(byHash);
        const urlResults = await Promise.all(
          hashes.map(async (hash) => {
            try {
              const url = await storageClient.getDirectURL(hash);
              return { hash, url };
            } catch {
              return null;
            }
          }),
        );

        const reconstructedPhotos: UploadedPhoto[] = [];
        const reconstructedAnalysis: Record<string, PhotoAnalysisState> = {};

        for (const result of urlResults) {
          if (!result) continue;
          const { hash, url } = result;
          reconstructedPhotos.push({ hash, url, name: "Saved Photo" });
          reconstructedAnalysis[hash] = {
            status: "done",
            defects: byHash[hash].map((d) => ({
              defectType: d.defectType,
              severity: d.severity as "low" | "medium" | "high",
              description: d.description,
            })),
          };
        }

        // Only set if no photos have been added in the current session
        setPhotos((prev) => {
          if (prev.length > 0) return prev;
          return reconstructedPhotos;
        });
        setPhotoAnalysis((prev) => {
          const hasExisting = Object.keys(prev).length > 0;
          if (hasExisting) return prev;
          return reconstructedAnalysis;
        });
      } catch {
        // Non-critical: silently fail, user can still upload new photos
      } finally {
        setLoadingPhotos(false);
      }
    }

    loadSavedPhotos();
  }, [actor, actorFetching, structure.id]);

  const overallLevel = overallConditionLevel(structure.currentCondition);
  const overallOrig = averageCondition(structure.originalCondition);
  const overallCurr = averageCondition(structure.currentCondition);
  const totalDegradation = Math.max(0, overallOrig - overallCurr);

  async function runDefectAnalysis(file: File, photoHash: string) {
    setPhotoAnalysis((prev) => ({
      ...prev,
      [photoHash]: { status: "analyzing" },
    }));

    try {
      const defects = await analyzeImageForDefects(file);

      setPhotoAnalysis((prev) => ({
        ...prev,
        [photoHash]: { status: "done", defects },
      }));

      // Save to backend
      if (actor) {
        const imageDefects: ImageDefect[] = defects.map((d) => ({
          id: crypto.randomUUID(),
          photoHash,
          defectType: d.defectType,
          structureId: structure.id,
          detectedAt: BigInt(Date.now()),
          description: d.description,
          severity: d.severity,
        }));
        actor
          .saveImageDefects(structure.id, photoHash, imageDefects)
          .catch(() => {
            // Non-critical: local state is already updated
          });
      }
    } catch {
      setPhotoAnalysis((prev) => ({
        ...prev,
        [photoHash]: { status: "error", message: "Analysis failed" },
      }));
    }
  }

  async function addPhotoWithAnalysis(file: File, photo: UploadedPhoto) {
    setPhotos((prev) => [...prev, photo]);
    await runDefectAnalysis(file, photo.hash);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (!identity) {
      toast.error("Please log in to upload photos");
      e.target.value = "";
      return;
    }
    const result = await uploadPhoto(file);
    if (result) {
      toast.success("Photo uploaded");
      await addPhotoWithAnalysis(file, result);
    } else {
      toast.error(
        uploadError ||
          "Upload failed. Please check your connection and try again.",
      );
    }
    e.target.value = "";
  }

  async function handleCameraCapture(file: File) {
    setCameraOpen(false);
    if (!identity) {
      toast.error("Please log in to upload photos");
      return;
    }
    const result = await uploadPhoto(file);
    if (result) {
      toast.success("Photo captured and uploaded");
      await addPhotoWithAnalysis(file, result);
    } else {
      toast.error(
        uploadError ||
          "Upload failed. Please check your connection and try again.",
      );
    }
  }

  function removePhoto(hash: string) {
    setPhotos((prev) => prev.filter((p) => p.hash !== hash));
    setPhotoAnalysis((prev) => {
      const next = { ...prev };
      delete next[hash];
      return next;
    });
  }

  // Aggregate all completed defects across all photos
  const allDefects: Array<{ photo: UploadedPhoto; defects: DetectedDefect[] }> =
    photos
      .map((photo) => {
        const state = photoAnalysis[photo.hash];
        if (state?.status === "done") {
          return { photo, defects: state.defects };
        }
        return null;
      })
      .filter(Boolean) as Array<{
      photo: UploadedPhoto;
      defects: DetectedDefect[];
    }>;

  const flatDefects = allDefects.flatMap((x) => x.defects);
  const highCount = flatDefects.filter((d) => d.severity === "high").length;
  const mediumCount = flatDefects.filter((d) => d.severity === "medium").length;
  const lowCount = flatDefects.filter((d) => d.severity === "low").length;

  // Most common defect type
  const defectTypeCounts = flatDefects.reduce<Record<string, number>>(
    (acc, d) => {
      acc[d.defectType] = (acc[d.defectType] || 0) + 1;
      return acc;
    },
    {},
  );
  const mostCommon =
    Object.entries(defectTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;

  const overallRisk =
    highCount >= 3
      ? "Critical — multiple high-severity defects require immediate professional intervention."
      : highCount >= 1
        ? "High risk — immediate conservation assessment recommended to prevent further deterioration."
        : mediumCount >= 2
          ? "Moderate risk — schedule professional inspection within the next 6 months."
          : flatDefects.length > 0
            ? "Low risk — continue routine monitoring and preventive maintenance."
            : "Insufficient data — upload more photos to generate a risk assessment.";

  return (
    <div className="space-y-6">
      {/* Structure Header */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">
              {structure.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-body">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {structure.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {structure.era}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`text-sm font-medium px-3 py-1 rounded-full border font-body ${getConditionBadgeClass(overallLevel)}`}
            >
              {getConditionLabel(overallLevel)} Condition
            </div>
            <Button
              data-ocid="overview.edit_condition_button"
              variant="outline"
              size="sm"
              onClick={() => setEditConditionOpen(true)}
              className="h-8 w-8 p-0 border-border hover:bg-muted/60"
              title="Edit current condition"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Degradation callout */}
        {totalDegradation > 0.5 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md flex items-start gap-2">
            <TrendingDown className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-orange-700 font-body">
              <span className="font-semibold">
                Overall degradation: {Math.round(totalDegradation)}%
              </span>{" "}
              compared to original documented condition.
              {totalDegradation >= 40
                ? " Urgent preservation action recommended."
                : " Regular monitoring advised."}
            </p>
          </div>
        )}
      </div>

      {/* Photo Gallery */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base font-semibold text-foreground">
            Photo Documentation
          </h3>
          <div className="flex items-center gap-2">
            <Button
              data-ocid="photo.camera_button"
              variant="outline"
              size="sm"
              onClick={() => setCameraOpen(true)}
              disabled={!identity}
              title={!identity ? "Please log in to upload photos" : undefined}
              className="gap-1.5 h-8 font-body text-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              Capture
            </Button>
            <Button
              data-ocid="photo.upload_button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !identity}
              title={!identity ? "Please log in to upload photos" : undefined}
              className="gap-1.5 h-8 font-body text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? `${uploadProgress}%` : "Upload"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {loadingPhotos ? (
          <div
            data-ocid="photo.loading_state"
            className="space-y-3"
            aria-label="Loading saved photos"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading saved photos…
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          </div>
        ) : photos.length === 0 ? (
          <button
            type="button"
            data-ocid="photo.dropzone"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-md py-10 flex flex-col items-center gap-2 cursor-pointer hover:border-terracotta/50 hover:bg-stone-50 transition-colors"
          >
            <Camera className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-body text-center">
              No photos yet. Click to upload or use the camera to capture
              on-site.
            </p>
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, idx) => {
              const analysis = photoAnalysis[photo.hash];
              const defectsForPhoto =
                analysis?.status === "done" ? analysis.defects : [];
              const isAnalyzing = analysis?.status === "analyzing";

              return (
                <motion.div
                  key={photo.hash}
                  data-ocid={`photo.item.${idx + 1}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group rounded-md overflow-hidden aspect-square bg-stone-100"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.hash)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>

                  {/* Defect count badge */}
                  <div className="absolute bottom-1 right-1">
                    {isAnalyzing ? (
                      <span className="flex items-center gap-1 bg-black/60 text-white text-[10px] font-body px-1.5 py-0.5 rounded-full">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Scanning
                      </span>
                    ) : defectsForPhoto.length > 0 ? (
                      <span
                        className={`text-[10px] font-semibold font-body px-1.5 py-0.5 rounded-full ${getDefectBadgeStyle(defectsForPhoto)}`}
                      >
                        {defectsForPhoto.length} defect
                        {defectsForPhoto.length !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Defect Analysis Section */}
      <AnimatePresence>
        {allDefects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <h3 className="font-display text-base font-semibold text-foreground px-0.5">
              Defect Analysis
            </h3>

            {allDefects.map(({ photo, defects }, idx) => (
              <motion.div
                key={photo.hash}
                data-ocid="photo.defect_panel"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-card border border-border rounded-lg p-4 shadow-xs"
              >
                {/* Photo thumbnail + name */}
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-12 h-12 rounded-md object-cover flex-shrink-0 border border-border"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-foreground truncate">
                      {photo.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      {defects.length} defect{defects.length !== 1 ? "s" : ""}{" "}
                      detected
                    </p>
                  </div>
                </div>

                {/* Defect list */}
                <div className="space-y-2.5">
                  {defects.map((defect) => (
                    <div
                      key={defect.defectType}
                      className="flex items-start gap-3 p-2.5 rounded-md bg-stone-50 border border-border/60"
                    >
                      <AlertTriangle
                        className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                          defect.severity === "high"
                            ? "text-red-500"
                            : defect.severity === "medium"
                              ? "text-amber-500"
                              : "text-green-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold font-display text-foreground">
                            {defect.defectType}
                          </span>
                          <span
                            className={`text-[10px] font-semibold font-body px-1.5 py-0.5 rounded-full border capitalize ${getSeverityColor(defect.severity)}`}
                          >
                            {defect.severity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-body leading-relaxed">
                          {defect.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Defects Summary Card */}
            {flatDefects.length > 0 && (
              <motion.div
                data-ocid="photo.defects_summary"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: allDefects.length * 0.08 + 0.1 }}
                className="bg-card border border-border rounded-lg p-5 shadow-xs"
              >
                <h4 className="font-display text-sm font-semibold text-foreground mb-4">
                  Defects Summary
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 bg-stone-50 rounded-md border border-border">
                    <p className="text-2xl font-display font-bold text-foreground">
                      {flatDefects.length}
                    </p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      Total Defects
                    </p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-md border border-red-100">
                    <p className="text-2xl font-display font-bold text-red-600">
                      {highCount}
                    </p>
                    <p className="text-xs text-red-500 font-body mt-0.5">
                      High Severity
                    </p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-md border border-amber-100">
                    <p className="text-2xl font-display font-bold text-amber-600">
                      {mediumCount}
                    </p>
                    <p className="text-xs text-amber-500 font-body mt-0.5">
                      Medium Severity
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-md border border-green-100">
                    <p className="text-2xl font-display font-bold text-green-600">
                      {lowCount}
                    </p>
                    <p className="text-xs text-green-500 font-body mt-0.5">
                      Low Severity
                    </p>
                  </div>
                </div>

                {mostCommon && (
                  <div className="flex items-center gap-2 mb-3 text-sm font-body">
                    <span className="text-muted-foreground">Most common:</span>
                    <Badge variant="secondary" className="font-body text-xs">
                      {mostCommon}
                    </Badge>
                  </div>
                )}

                <div className="p-3 rounded-md border-l-4 border-l-amber-400 bg-amber-50/60">
                  <p className="text-xs text-amber-800 font-body leading-relaxed">
                    <span className="font-semibold">
                      Overall Risk Assessment:{" "}
                    </span>
                    {overallRisk}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show loading skeletons while any photos are being analyzed */}
      {photos.some((p) => photoAnalysis[p.hash]?.status === "analyzing") &&
        allDefects.length === 0 && (
          <div
            data-ocid="photo.loading_state"
            className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-3"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

      {/* Condition Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <ConditionPanel
          title="Original Condition"
          subtitle="Documented baseline"
          condition={structure.originalCondition}
          isOriginal
        />
        <ConditionPanel
          title="Current Condition"
          subtitle="Latest assessment"
          condition={structure.currentCondition}
          compareWith={structure.originalCondition}
        />
      </div>

      {/* Component-level degradation */}
      <DegradationCard
        original={structure.originalCondition}
        current={structure.currentCondition}
      />

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      <EditConditionDialog
        structure={structure}
        open={editConditionOpen}
        onOpenChange={setEditConditionOpen}
      />
    </div>
  );
}

function ConditionPanel({
  title,
  subtitle,
  condition,
  compareWith,
  isOriginal,
}: {
  title: string;
  subtitle: string;
  condition: ConditionStatus;
  compareWith?: ConditionStatus;
  isOriginal?: boolean;
}) {
  const fields: Array<{ key: keyof ConditionStatus; label: string }> = [
    { key: "foundation", label: "Foundation" },
    { key: "walls", label: "Walls" },
    { key: "roof", label: "Roof" },
  ];

  const avg = averageCondition(condition);
  const level = getConditionLevel(avg);

  return (
    <div
      className={`bg-card border rounded-lg p-5 shadow-xs ${
        isOriginal ? "border-border" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground font-body">{subtitle}</p>
        </div>
        <div
          className={`text-xs font-medium px-2 py-0.5 rounded-full border font-body ${getConditionBadgeClass(level)}`}
        >
          {Math.round(avg)}%
        </div>
      </div>

      <div className="space-y-3">
        {fields.map(({ key, label }) => {
          const val = Number(condition[key]);
          const origVal = compareWith ? Number(compareWith[key]) : val;
          const condLevel = getConditionLevel(val);
          const diff = val - origVal;

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-body">
                  {label}
                </span>
                <div className="flex items-center gap-1.5">
                  {!isOriginal && diff !== 0 && (
                    <span
                      className={`text-xs font-mono ${diff < 0 ? "text-red-500" : "text-green-600"}`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff}%
                    </span>
                  )}
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {val}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${val}%`,
                    background:
                      condLevel === "good"
                        ? "oklch(0.65 0.15 145)"
                        : condLevel === "fair"
                          ? "oklch(0.72 0.16 80)"
                          : condLevel === "poor"
                            ? "oklch(0.65 0.18 50)"
                            : "oklch(0.55 0.22 25)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DegradationCard({
  original,
  current,
}: {
  original: ConditionStatus;
  current: ConditionStatus;
}) {
  const fields: Array<{
    key: keyof ConditionStatus;
    label: string;
    desc: string;
  }> = [
    { key: "foundation", label: "Foundation", desc: "Base structural support" },
    { key: "walls", label: "Walls", desc: "Vertical structural elements" },
    { key: "roof", label: "Roof", desc: "Upper covering & weatherproofing" },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-xs">
      <h3 className="font-display text-base font-semibold text-foreground mb-4">
        Degradation Analysis
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {fields.map(({ key, label, desc }) => {
          const origVal = Number(original[key]);
          const currVal = Number(current[key]);
          const diff = origVal - currVal;
          const pctChange = origVal > 0 ? (diff / origVal) * 100 : 0;

          return (
            <div
              key={key}
              className="p-4 bg-stone-50 border border-border rounded-md"
            >
              <p className="font-display text-sm font-semibold text-foreground mb-0.5">
                {label}
              </p>
              <p className="text-xs text-muted-foreground font-body mb-3">
                {desc}
              </p>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {Math.abs(Math.round(pctChange))}%
                  </p>
                  <p className="text-xs font-body text-muted-foreground">
                    {diff > 0
                      ? "degraded"
                      : diff < 0
                        ? "improved"
                        : "unchanged"}
                  </p>
                </div>
                <div>
                  {diff > 0 ? (
                    <TrendingDown className="w-6 h-6 text-red-500" />
                  ) : diff < 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  ) : (
                    <Minus className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs font-body text-muted-foreground">
                {origVal}% → {currVal}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

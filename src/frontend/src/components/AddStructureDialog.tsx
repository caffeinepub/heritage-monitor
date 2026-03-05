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
import { Slider } from "@/components/ui/slider";
import { Principal } from "@icp-sdk/core/principal";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useAddStructure } from "../hooks/useQueries";

interface AddStructureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConditionSliders {
  foundation: number;
  walls: number;
  roof: number;
}

const DEFAULT_CONDITION: ConditionSliders = {
  foundation: 100,
  walls: 100,
  roof: 100,
};

export function AddStructureDialog({
  open,
  onOpenChange,
}: AddStructureDialogProps) {
  const { mutate: addStructure, isPending } = useAddStructure();
  const { identity } = useInternetIdentity();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [era, setEra] = useState("");
  const [original, setOriginal] = useState<ConditionSliders>({
    ...DEFAULT_CONDITION,
  });
  const [current, setCurrent] = useState<ConditionSliders>({
    foundation: 70,
    walls: 65,
    roof: 80,
  });

  function handleClose() {
    if (isPending) return;
    onOpenChange(false);
    setName("");
    setLocation("");
    setEra("");
    setOriginal({ ...DEFAULT_CONDITION });
    setCurrent({ foundation: 70, walls: 65, roof: 80 });
  }

  function handleSubmit() {
    if (!name.trim() || !location.trim() || !era.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const callerPrincipal = identity
      ? identity.getPrincipal()
      : Principal.anonymous();

    addStructure(
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        location: location.trim(),
        era: era.trim(),
        originalCondition: {
          foundation: BigInt(original.foundation),
          walls: BigInt(original.walls),
          roof: BigInt(original.roof),
        },
        currentCondition: {
          foundation: BigInt(current.foundation),
          walls: BigInt(current.walls),
          roof: BigInt(current.roof),
        },
        addedAt: BigInt(Date.now()),
        addedBy: callerPrincipal,
      },
      {
        onSuccess: () => {
          toast.success(`"${name}" added successfully`);
          handleClose();
        },
        onError: (err) => {
          toast.error(`Failed to add structure: ${err.message}`);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-ocid="add_structure.dialog"
        className="max-w-lg max-h-[90vh] overflow-y-auto bg-card"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Add Heritage Structure
          </DialogTitle>
          <DialogDescription className="font-body text-sm">
            Register a new heritage structure for monitoring and preservation
            tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="struct-name"
                className="font-body text-sm font-medium"
              >
                Structure Name *
              </Label>
              <Input
                id="struct-name"
                data-ocid="add_structure.name_input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ajanta Cave Complex"
                className="mt-1 h-9 font-body"
              />
            </div>

            <div>
              <Label
                htmlFor="struct-location"
                className="font-body text-sm font-medium"
              >
                Location *
              </Label>
              <Input
                id="struct-location"
                data-ocid="add_structure.location_input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Aurangabad, Maharashtra, India"
                className="mt-1 h-9 font-body"
              />
            </div>

            <div>
              <Label
                htmlFor="struct-era"
                className="font-body text-sm font-medium"
              >
                Historical Era / Period *
              </Label>
              <Input
                id="struct-era"
                data-ocid="add_structure.era_input"
                value={era}
                onChange={(e) => setEra(e.target.value)}
                placeholder="e.g. 2nd century BCE – 6th century CE"
                className="mt-1 h-9 font-body"
              />
            </div>
          </div>

          {/* Original Condition */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">
              Original / Documented Condition
            </h4>
            <ConditionSliderGroup value={original} onChange={setOriginal} />
          </div>

          {/* Current Condition */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">
              Current Observed Condition
            </h4>
            <ConditionSliderGroup value={current} onChange={setCurrent} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="add_structure.cancel_button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            className="font-body"
          >
            Cancel
          </Button>
          <Button
            data-ocid="add_structure.submit_button"
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
              "Save Structure"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConditionSliderGroup({
  value,
  onChange,
}: {
  value: { foundation: number; walls: number; roof: number };
  onChange: (v: { foundation: number; walls: number; roof: number }) => void;
}) {
  const fields = [
    { key: "foundation" as const, label: "Foundation" },
    { key: "walls" as const, label: "Walls" },
    { key: "roof" as const, label: "Roof" },
  ];

  return (
    <div className="space-y-4">
      {fields.map(({ key, label }) => {
        const val = value[key];
        const color =
          val >= 75
            ? "oklch(0.65 0.15 145)"
            : val >= 50
              ? "oklch(0.72 0.16 80)"
              : val >= 25
                ? "oklch(0.65 0.18 50)"
                : "oklch(0.55 0.22 25)";

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="font-body text-xs text-muted-foreground">
                {label}
              </Label>
              <span
                className="text-xs font-mono font-semibold"
                style={{ color }}
              >
                {val}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[val]}
              onValueChange={([v]) => onChange({ ...value, [key]: v })}
              className="w-full"
            />
          </div>
        );
      })}
    </div>
  );
}

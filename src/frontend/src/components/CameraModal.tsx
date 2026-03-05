import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, ImageIcon, X } from "lucide-react";
import { useRef } from "react";

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraModal({ open, onClose, onCapture }: CameraModalProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onCapture(file);
    onClose();
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="photo.camera_modal"
        className="max-w-sm bg-card"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-base">
              Add Photo
            </DialogTitle>
            <Button
              data-ocid="photo.close_button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 -mr-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground font-body -mt-1">
          Take a new photo using your device camera, or choose an existing image
          from your gallery.
        </p>

        <div className="flex flex-col gap-3 pt-1">
          {/* Hidden camera input — triggers native camera on mobile */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            className="hidden"
          />

          {/* Hidden gallery input — no capture attribute, opens file picker */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />

          <Button
            data-ocid="photo.open_camera_button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full gap-2 font-body bg-primary hover:bg-primary/90"
          >
            <Camera className="w-4 h-4" />
            Open Camera
          </Button>

          <Button
            data-ocid="photo.gallery_button"
            variant="outline"
            onClick={() => galleryInputRef.current?.click()}
            className="w-full gap-2 font-body"
          >
            <ImageIcon className="w-4 h-4" />
            Choose from Gallery
          </Button>

          <Button
            data-ocid="photo.cancel_button"
            variant="ghost"
            onClick={onClose}
            className="w-full font-body text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

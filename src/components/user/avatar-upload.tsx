"use client";

import { useRef, useState } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { AvatarCropDialog } from "@/components/user/avatar-crop-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Trash2, RefreshCw } from "lucide-react";

type Props = {
  imageUrl?: string | null;
  name?: string | null;
  onUpdated: (url: string | null) => void;
};

export function AvatarUpload({ imageUrl, name, onUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function uploadBlob(blob: Blob) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Upload fehlgeschlagen");
        return;
      }
      onUpdated(data.imageUrl ?? data.user?.image ?? null);
      toast.success("Profilbild aktualisiert");
    } catch {
      toast.error("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  }

  function onFileSelected(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte ein Bild (JPG, PNG, WebP) wählen");
      return;
    }
    setPendingFile(file);
  }

  async function remove() {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Löschen fehlgeschlagen");
        return;
      }
      onUpdated(null);
      toast.success("Profilbild entfernt");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="relative group rounded-full shrink-0"
          aria-label="Profilbild ändern"
        >
          <span className="block rounded-full ring-2 ring-accent/30 ring-offset-4 ring-offset-zinc-950">
            <UserAvatar src={imageUrl} name={name} size="lg" />
          </span>
          <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
            e.target.value = "";
          }}
        />

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Bild wechseln
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={remove}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Entfernen
            </Button>
          )}
          <p className="text-[11px] text-zinc-500">Zuschneiden, Vorschau, dann Upload</p>
        </div>
      </div>

      {pendingFile && (
        <AvatarCropDialog
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={(blob) => void uploadBlob(blob)}
        />
      )}
    </>
  );
}

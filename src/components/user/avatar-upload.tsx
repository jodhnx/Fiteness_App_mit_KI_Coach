"use client";

import { useRef, useState } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";

type Props = {
  imageUrl?: string | null;
  name?: string | null;
  onUpdated: (url: string | null) => void;
};

export function AvatarUpload({ imageUrl, name, onUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
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
    }
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
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group rounded-full"
        aria-label="Profilbild ändern"
      >
        <UserAvatar src={imageUrl} name={name} size="lg" />
        <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera className="h-5 w-5 text-white" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Bild hochladen
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
      </div>
    </div>
  );
}

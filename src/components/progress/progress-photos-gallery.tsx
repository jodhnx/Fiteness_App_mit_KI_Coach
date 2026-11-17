"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  Camera,
  ImagePlus,
  Trash2,
  X,
  Columns2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImageForUpload } from "@/lib/compress-image-client";
import { parsePhotoCaption } from "@/lib/progress-photo-meta";
import { cn } from "@/lib/utils";

export type ProgressPhotoItem = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  takenAt?: string | null;
  aiProgress?: string | null;
};

type Props = {
  photos: ProgressPhotoItem[];
  defaultWeightKg?: number | null;
  onChanged: () => void;
};

function monthKey(iso: string) {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return "Unbekannt";
  return format(d, "MMMM yyyy", { locale: de });
}

export function ProgressPhotosGallery({
  photos,
  defaultWeightKg,
  onChanged,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [takenAt, setTakenAt] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [weightKg, setWeightKg] = useState(
    defaultWeightKg != null ? String(defaultWeightKg) : ""
  );
  const [note, setNote] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...photos].sort((a, b) => {
        const ta = a.takenAt ? new Date(a.takenAt).getTime() : 0;
        const tb = b.takenAt ? new Date(b.takenAt).getTime() : 0;
        return tb - ta;
      }),
    [photos]
  );

  const groups = useMemo(() => {
    const map = new Map<string, ProgressPhotoItem[]>();
    for (const p of sorted) {
      const key = p.takenAt ? monthKey(p.takenAt) : "Ohne Datum";
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [sorted]);

  const viewer = sorted.find((p) => p.id === viewerId) ?? null;
  const left = sorted.find((p) => p.id === compareA) ?? sorted[sorted.length - 1];
  const right = sorted.find((p) => p.id === compareB) ?? sorted[0];

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const raw of Array.from(files)) {
        const file = await compressImageForUpload(raw);
        const fd = new FormData();
        fd.append("file", file);
        if (takenAt) fd.append("takenAt", takenAt);
        const w = Number(String(weightKg).replace(",", "."));
        if (Number.isFinite(w) && w > 0) fd.append("weightKg", String(w));
        if (note.trim()) fd.append("caption", note.trim());
        // Privacy: never send photos to AI unless explicitly requested later
        fd.append("analyze", "0");

        const res = await fetch("/api/progress/photos", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Upload fehlgeschlagen");
          continue;
        }
        ok += 1;
      }
      if (ok > 0) {
        toast.success(
          ok === 1 ? "Foto gespeichert" : `${ok} Fotos gespeichert`
        );
        setNote("");
        onChanged();
      }
    } catch {
      toast.error("Netzwerkfehler beim Upload");
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  async function deletePhoto(id: string) {
    if (!window.confirm("Dieses Fortschrittsfoto unwiderruflich löschen?")) {
      return;
    }
    setDeleting(id);
    try {
      const res = await fetch(`/api/progress/photos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Löschen fehlgeschlagen");
        return;
      }
      toast.success("Foto gelöscht");
      if (viewerId === id) setViewerId(null);
      onChanged();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="card-premium p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Fortschrittsfotos
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Privat gespeichert — nur für dich sichtbar. Keine KI-Analyse ohne
              ausdrückliche Freigabe.
            </p>
          </div>
          {sorted.length >= 2 && (
            <Button
              type="button"
              variant="secondary"
              className="h-9 rounded-xl shrink-0 text-xs"
              onClick={() => {
                setCompareMode((v) => !v);
                if (!compareA && sorted[sorted.length - 1])
                  setCompareA(sorted[sorted.length - 1]!.id);
                if (!compareB && sorted[0]) setCompareB(sorted[0]!.id);
              }}
            >
              <Columns2 className="h-3.5 w-3.5 mr-1.5" />
              Vergleich
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Datum</Label>
            <Input
              type="date"
              className="mt-1 h-10 rounded-xl"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Gewicht (optional)</Label>
            <Input
              type="text"
              inputMode="decimal"
              className="mt-1 h-10 rounded-xl"
              placeholder="z. B. 78,5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Notiz (optional)</Label>
          <Input
            className="mt-1 h-10 rounded-xl"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Frontlicht, gleiche Pose"
            maxLength={200}
          />
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          multiple
          onChange={(e) => void uploadFiles(e.target.files)}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          className="hidden"
          multiple
          onChange={(e) => void uploadFiles(e.target.files)}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            className="h-12 rounded-xl"
            disabled={uploading}
            onClick={() => cameraRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            Aufnehmen
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-12 rounded-xl"
            disabled={uploading}
            onClick={() => galleryRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Galerie
          </Button>
        </div>
      </section>

      {compareMode && sorted.length >= 2 && left && right && (
        <section className="card-premium p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Vorher / Nachher
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Vorher", photo: left, set: setCompareA },
              { label: "Nachher", photo: right, set: setCompareB },
            ].map(({ label, photo, set }) => {
              const meta = parsePhotoCaption(photo.caption);
              return (
                <div key={label} className="space-y-1.5">
                  <select
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs dark:border-white/10 dark:bg-zinc-900"
                    value={photo.id}
                    onChange={(e) => set(e.target.value)}
                  >
                    {sorted.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.takenAt
                          ? format(new Date(p.takenAt), "dd.MM.yyyy")
                          : p.id.slice(0, 6)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10"
                    onClick={() => setViewerId(photo.id)}
                  >
                    <p className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-50 dark:bg-zinc-900">
                      {label}
                      {photo.takenAt
                        ? ` · ${format(new Date(photo.takenAt), "dd.MM.yyyy")}`
                        : ""}
                      {meta.weightKg != null ? ` · ${meta.weightKg} kg` : ""}
                    </p>
                    <Image
                      src={photo.imageUrl}
                      alt={label}
                      width={280}
                      height={320}
                      unoptimized
                      className="w-full h-44 object-cover"
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-500 py-8 text-center">
          Noch keine Fortschrittsfotos. Nimm eines auf oder wähle aus der Galerie.
        </p>
      ) : (
        groups.map(([month, items]) => (
          <section key={month} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 px-0.5">
              {month}
            </h4>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {items.map((p) => {
                const meta = parsePhotoCaption(p.caption);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setViewerId(p.id)}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900"
                  >
                    <Image
                      src={p.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="33vw"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-6 text-[10px] text-white tabular-nums">
                      {p.takenAt
                        ? format(new Date(p.takenAt), "dd.MM.")
                        : "—"}
                      {meta.weightKg != null ? ` · ${meta.weightKg}kg` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-black/95"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="min-w-0 text-white">
              <p className="text-sm font-semibold truncate">
                {viewer.takenAt
                  ? format(new Date(viewer.takenAt), "dd. MMMM yyyy", {
                      locale: de,
                    })
                  : "Fortschrittsfoto"}
              </p>
              {(() => {
                const meta = parsePhotoCaption(viewer.caption);
                return (
                  <p className="text-xs text-zinc-400">
                    {meta.weightKg != null ? `${meta.weightKg} kg` : ""}
                    {meta.note
                      ? `${meta.weightKg != null ? " · " : ""}${meta.note}`
                      : ""}
                  </p>
                );
              })()}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={cn(
                  "h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-red-300",
                  deleting === viewer.id && "opacity-50"
                )}
                aria-label="Löschen"
                disabled={deleting === viewer.id}
                onClick={() => void deletePhoto(viewer.id)}
              >
                {deleting === viewer.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white"
                aria-label="Schließen"
                onClick={() => setViewerId(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 relative min-h-0">
            <Image
              src={viewer.imageUrl}
              alt="Fortschrittsfoto"
              fill
              unoptimized
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  );
}

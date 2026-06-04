"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ZoomIn } from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

const OUT_SIZE = 512;

export function AvatarCropDialog({ file, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1.1);
  const [offsetY, setOffsetY] = useState(0);
  const [busy, setBusy] = useState(false);

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, size, size);

    const minSide = Math.min(img.width, img.height);
    const scale = (size / minSide) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const x = (size - drawW) / 2;
    const y = (size - drawH) / 2 + offsetY;

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.strokeStyle = "rgba(34, 211, 238, 0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, size - 16, size - 16);
  }, [zoom, offsetY]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      drawPreview();
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, drawPreview]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  function exportBlob() {
    const img = imgRef.current;
    if (!img) return null;
    const out = document.createElement("canvas");
    out.width = OUT_SIZE;
    out.height = OUT_SIZE;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    const minSide = Math.min(img.width, img.height);
    const scale = (OUT_SIZE / minSide) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const x = (OUT_SIZE - drawW) / 2;
    const y = (OUT_SIZE - drawH) / 2 + (offsetY * OUT_SIZE) / 280;

    ctx.drawImage(img, x, y, drawW, drawH);
    return new Promise<Blob | null>((resolve) => {
      out.toBlob((b) => resolve(b), "image/jpeg", 0.9);
    });
  }

  async function confirm() {
    setBusy(true);
    const blob = await exportBlob();
    setBusy(false);
    if (blob) onConfirm(blob);
    else onCancel();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 p-4 safe-area-pb">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Profilbild anpassen</h2>
          <button type="button" onClick={onCancel} aria-label="Schließen">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <div className="relative mx-auto w-[min(280px,100%)] aspect-square rounded-2xl overflow-hidden border border-white/10">
          <canvas ref={canvasRef} width={280} height={280} className="w-full h-full" />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-500 flex items-center gap-1">
            <ZoomIn className="h-3.5 w-3.5" /> Zoom
          </label>
          <input
            type="range"
            min={1}
            max={2.5}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <label className="text-xs text-zinc-500">Position (vertikal)</label>
          <input
            type="range"
            min={-80}
            max={80}
            value={offsetY}
            onChange={(e) => setOffsetY(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="button" className="flex-1 btn-accent" disabled={busy} onClick={() => void confirm()}>
            {busy ? "Speichern…" : "Übernehmen"}
          </Button>
        </div>
      </div>
    </div>
  );
}

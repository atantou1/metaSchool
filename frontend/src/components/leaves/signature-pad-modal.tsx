"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenTool, RotateCcw, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title?: string;
  description?: string;
}

export function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = "Ψηφιακή Υπογραφή",
  description = "Υπογράψτε με το ποντίκι ή την οθόνη αφής. Η υπογραφή θα κροπαριστεί αυτόματα.",
}: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState<string>("#1e3a8a"); // Classic blue ink

  // Setup canvas resolution and styling on mount/open
  useEffect(() => {
    if (!isOpen) return;

    const setupCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = strokeColor;
      }
      setHasDrawn(false);
    };

    // Ensure Dialog animation has finished
    const timer = setTimeout(setupCanvas, 100);

    // Also observe canvas resize
    const ro = new ResizeObserver(() => {
      if (!hasDrawn) {
        setupCanvas();
      }
    });

    if (canvasRef.current) {
      ro.observe(canvasRef.current);
    }

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [isOpen]);

  // Update stroke color if changed
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = strokeColor;
    }
  }, [strokeColor]);

  // Coordinates helper using PointerEvent
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = strokeColor;
    setHasDrawn(false);
  };

  // Auto-crop bounding box around drawn strokes and export transparent PNG
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      toast.error("Παρακαλώ σχεδιάστε την υπογραφή σας πριν την αποθήκευση.");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;

    const imgData = ctx.getImageData(0, 0, width, height);
    const { data } = imgData;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let foundPixel = false;

    // Scan for non-transparent pixels (alpha > 20)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 20) {
          foundPixel = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foundPixel) {
      toast.error("Δεν εντοπίστηκε υπογραφή. Παρακαλώ υπογράψτε στον καμβά.");
      return;
    }

    // Add safe padding in canvas pixels
    const padding = Math.round(12 * dpr);
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const croppedWidth = maxX - minX;
    const croppedHeight = maxY - minY;

    // Create offscreen canvas for crisp cropped transparent PNG
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = croppedWidth;
    cropCanvas.height = croppedHeight;
    const cropCtx = cropCanvas.getContext("2d");

    if (!cropCtx) {
      toast.error("Σφάλμα επεξεργασίας εικόνας");
      return;
    }

    cropCtx.drawImage(
      canvas,
      minX,
      minY,
      croppedWidth,
      croppedHeight,
      0,
      0,
      croppedWidth,
      croppedHeight
    );

    const croppedDataUrl = cropCanvas.toDataURL("image/png");
    onSave(croppedDataUrl);
    toast.success("Η υπογραφή κροπαρίστηκε και αποθηκεύτηκε επιτυχώς!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        overlayClassName="z-[190]"
        className="z-[200] max-w-lg p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl"
      >
        <DialogHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <PenTool className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {title}
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {/* Controls: Color pickers & reset */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[11px]">Χρώμα μελάνης:</span>
              <button
                type="button"
                onClick={() => setStrokeColor("#1e3a8a")}
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform ${
                  strokeColor === "#1e3a8a"
                    ? "border-blue-600 scale-110 shadow-xs"
                    : "border-zinc-300 opacity-60"
                }`}
                style={{ backgroundColor: "#1e3a8a" }}
                title="Μπλε μελάνη"
              />
              <button
                type="button"
                onClick={() => setStrokeColor("#09090b")}
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform ${
                  strokeColor === "#09090b"
                    ? "border-zinc-900 scale-110 shadow-xs"
                    : "border-zinc-300 opacity-60"
                }`}
                style={{ backgroundColor: "#09090b" }}
                title="Μαύρη μελάνη"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 text-xs gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            >
              <RotateCcw className="w-3 h-3" />
              Καθαρισμός
            </Button>
          </div>

          {/* Interactive Canvas container */}
          <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden select-none touch-none h-60 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              className="w-full h-full cursor-crosshair block touch-none"
              style={{ touchAction: "none" }}
            />

            {/* Baseline Guide */}
            <div className="absolute bottom-12 left-10 right-10 border-b border-zinc-300/80 dark:border-zinc-700/80 pointer-events-none flex justify-between items-end pb-0.5">
              <span className="text-[10px] text-zinc-400 font-sans tracking-wide">
                ✕ Υπογράψτε πάνω στη γραμμή
              </span>
            </div>

            {!hasDrawn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-400 gap-1.5 opacity-60">
                <PenTool className="w-6 h-6" />
                <span className="text-xs">Σχεδιάστε εδώ με το ποντίκι ή την αφή</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-400 text-center">
            💡 Το σύστημα θα απομονώσει αυτόματα μόνο την υπογραφή, αφαιρώντας τα κενά περιθώρια.
          </p>
        </div>

        <DialogFooter className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Ακύρωση
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!hasDrawn}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            Αποθήκευση Υπογραφής
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

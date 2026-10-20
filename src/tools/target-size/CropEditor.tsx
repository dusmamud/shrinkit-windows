import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "@phosphor-icons/react";

interface CropEditorProps {
  imageUrl: string;
  fileName: string;
  onApply: (file: File) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_SIZE = 24;

/** Aspect presets: `ratio` is width / height, null = free-form. */
const ASPECTS: { label: string; ratio: number | null }[] = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "2:3", ratio: 2 / 3 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "5:4", ratio: 5 / 4 },
  { label: "21:9", ratio: 21 / 9 },
];

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

const HANDLE_CURSORS: Record<Exclude<Handle, "move">, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

function clampRect(r: Rect, maxW: number, maxH: number): Rect {
  const w = Math.min(Math.max(r.w, MIN_SIZE), maxW);
  const h = Math.min(Math.max(r.h, MIN_SIZE), maxH);
  const x = Math.min(Math.max(r.x, 0), maxW - w);
  const y = Math.min(Math.max(r.y, 0), maxH - h);
  return { x, y, w, h };
}

/** Largest centered rect of the given ratio inside the box (90% coverage). */
function fittedRect(ratio: number | null, maxW: number, maxH: number): Rect {
  if (ratio === null) {
    const w = maxW * 0.9;
    const h = maxH * 0.9;
    return { x: (maxW - w) / 2, y: (maxH - h) / 2, w, h };
  }
  let w = maxW * 0.9;
  let h = w / ratio;
  if (h > maxH * 0.9) {
    h = maxH * 0.9;
    w = h * ratio;
  }
  return { x: (maxW - w) / 2, y: (maxH - h) / 2, w, h };
}

/**
 * Crop screen (desktop best practice, cross-checked against standard
 * cropper UX):
 * - the crop box itself is dragged to move and resized from 8 handles;
 *   in "Free" mode width and height change independently
 * - the area OUTSIDE the box is dimmed (no transparency inside the box)
 * - a rule-of-thirds grid sits inside the box
 * - aspect presets live in a horizontally scrollable row
 */
export default function CropEditor({
  imageUrl,
  fileName,
  onApply,
  onCancel,
}: CropEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number } | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [applying, setApplying] = useState(false);

  const measure = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDisplay((prev) => {
        if (
          prev &&
          Math.abs(prev.w - rect.width) < 1 &&
          Math.abs(prev.h - rect.height) < 1
        ) {
          return prev;
        }
        return { w: rect.width, h: rect.height };
      });
    }
  }, []);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    measure();
  };

  // Initialize / refit the crop box when the image or aspect changes.
  useEffect(() => {
    if (!display) return;
    setCrop((prev) => {
      if (prev.w === 0) return fittedRect(aspect, display.w, display.h);
      return clampRect(prev, display.w, display.h);
    });
  }, [display, aspect]);

  // Keep the crop proportional when the window resizes.
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  const selectAspect = (ratio: number | null) => {
    setAspect(ratio);
    if (display) setCrop(fittedRect(ratio, display.w, display.h));
  };

  const startDrag = (e: React.PointerEvent, handle: Handle) => {
    if (!display) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRect = { ...crop };
    const maxW = display.w;
    const maxH = display.h;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let r = { ...startRect };

      if (handle === "move") {
        r.x = startRect.x + dx;
        r.y = startRect.y + dy;
        setCrop(clampRect(r, maxW, maxH));
        return;
      }

      // Resize from the dragged edges; the opposite edge stays anchored.
      let left = startRect.x;
      let top = startRect.y;
      let right = startRect.x + startRect.w;
      let bottom = startRect.y + startRect.h;
      if (handle.includes("w")) left += dx;
      if (handle.includes("e")) right += dx;
      if (handle.includes("n")) top += dy;
      if (handle.includes("s")) bottom += dy;

      if (aspect === null) {
        // Free-form: width and height change independently.
        left = Math.min(Math.max(left, 0), right - MIN_SIZE);
        right = Math.max(Math.min(right, maxW), left + MIN_SIZE);
        top = Math.min(Math.max(top, 0), bottom - MIN_SIZE);
        bottom = Math.max(Math.min(bottom, maxH), top + MIN_SIZE);
        r = { x: left, y: top, w: right - left, h: bottom - top };
      } else {
        // Fixed ratio: drive from the horizontal change for corner/e-w
        // handles, from the vertical change for n-s handles, then keep
        // the anchored corner fixed and clamp inside the image.
        const cornerH = handle.includes("e") || handle.includes("w");
        const cornerV = handle.includes("n") || handle.includes("s");
        let w = right - left;
        let h = bottom - top;
        if (cornerH && cornerV) {
          if (Math.abs(dx) >= Math.abs(dy)) h = w / aspect;
          else w = h * aspect;
        } else if (cornerH) {
          h = w / aspect;
        } else {
          w = h * aspect;
        }
        // Anchor: the corner/edge opposite the handle stays put.
        const anchorX = handle.includes("w") ? right : left;
        const anchorY = handle.includes("n") ? bottom : top;
        // Clamp size to the space available from the anchor.
        const availW = handle.includes("w") ? anchorX : maxW - anchorX;
        const availH = handle.includes("n") ? anchorY : maxH - anchorY;
        if (w > availW) {
          w = availW;
          h = w / aspect;
        }
        if (h > availH) {
          h = availH;
          w = h * aspect;
        }
        if (w < MIN_SIZE) {
          w = MIN_SIZE;
          h = w / aspect;
        }
        if (h < MIN_SIZE) {
          h = MIN_SIZE;
          w = h * aspect;
        }
        r = {
          x: handle.includes("w") ? anchorX - w : anchorX,
          y: handle.includes("n") ? anchorY - h : anchorY,
          w,
          h,
        };
        r = clampRect(r, maxW, maxH);
      }
      setCrop(r);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleApply = async () => {
    if (!natural || !display || crop.w === 0 || applying) return;
    setApplying(true);
    try {
      const scaleX = natural.w / display.w;
      const scaleY = natural.h / display.h;
      const sx = Math.round(crop.x * scaleX);
      const sy = Math.round(crop.y * scaleY);
      const sw = Math.max(1, Math.round(crop.w * scaleX));
      const sh = Math.max(1, Math.round(crop.h * scaleY));

      const img = imgRef.current;
      if (!img) return;
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) return;
      const base = fileName.replace(/\.[^.]+$/, "");
      onApply(new File([blob], `${base}-cropped.png`, { type: "image/png" }));
    } finally {
      setApplying(false);
    }
  };

  const scale = natural && display ? natural.w / display.w : 1;
  const cropNaturalW = Math.round(crop.w * scale);
  const cropNaturalH = Math.round(crop.h * (natural && display ? natural.h / display.h : 1));

  const handles: { id: Exclude<Handle, "move">; style: React.CSSProperties }[] = [
    { id: "nw", style: { left: -7, top: -7 } },
    { id: "n", style: { left: "calc(50% - 7px)", top: -7 } },
    { id: "ne", style: { right: -7, top: -7 } },
    { id: "e", style: { right: -7, top: "calc(50% - 7px)" } },
    { id: "se", style: { right: -7, bottom: -7 } },
    { id: "s", style: { left: "calc(50% - 7px)", bottom: -7 } },
    { id: "sw", style: { left: -7, bottom: -7 } },
    { id: "w", style: { left: -7, top: "calc(50% - 7px)" } },
  ];

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-tink">Crop Image</h2>
        <span className="text-xs text-tmuted">
          {cropNaturalW} × {cropNaturalH} px
        </span>
      </div>

      {/* Stage */}
      <div className="flex items-center justify-center rounded-2xl border border-tline bg-[#111] p-4">
        <div className="relative inline-block max-w-full select-none">
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Crop source"
            onLoad={handleImgLoad}
            draggable={false}
            className="block max-h-[52vh] w-auto max-w-full"
          />
          {display && crop.w > 0 && (
            <>
              {/* Dimmed surround: four panels OUTSIDE the crop box. */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 bg-black/60"
                style={{ height: crop.y }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60"
                style={{ height: Math.max(0, display.h - crop.y - crop.h) }}
              />
              <div
                className="pointer-events-none absolute bg-black/60"
                style={{
                  left: 0,
                  top: crop.y,
                  width: crop.x,
                  height: crop.h,
                }}
              />
              <div
                className="pointer-events-none absolute bg-black/60"
                style={{
                  right: 0,
                  top: crop.y,
                  width: Math.max(0, display.w - crop.x - crop.w),
                  height: crop.h,
                }}
              />

              {/* Crop box */}
              <div
                className="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h,
                }}
                onPointerDown={(e) => startDrag(e, "move")}
              >
                {/* Rule-of-thirds grid */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/30" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/30" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/30" />
                </div>
                {/* Resize handles */}
                {handles.map((h) => (
                  <div
                    key={h.id}
                    role="presentation"
                    className="absolute z-10 h-3.5 w-3.5 rounded-[3px] border border-black/40 bg-white shadow"
                    style={{ ...h.style, cursor: HANDLE_CURSORS[h.id] }}
                    onPointerDown={(e) => startDrag(e, h.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Aspect presets: horizontally scrollable row */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {ASPECTS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => selectAspect(a.ratio)}
            className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              aspect === a.ratio
                ? "bg-taccent text-white shadow-sm"
                : "border border-tline bg-tsurface text-tink hover:border-taccent hover:bg-tsurface2"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-tline px-4 py-2.5 text-sm font-medium text-tink transition hover:bg-tsurface2"
        >
          <X size={16} />
          <span>Cancel</span>
        </button>
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={applying || crop.w === 0}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-tbtna px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0257bf] disabled:opacity-60"
        >
          <Check size={16} weight="bold" />
          <span>{applying ? "Applying..." : "Apply Crop"}</span>
        </button>
      </div>
    </div>
  );
}

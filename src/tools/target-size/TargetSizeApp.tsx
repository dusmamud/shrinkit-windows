import { useState, useRef, useCallback } from "react";
import {
  downloadFile,
  scrollIntoViewIfNeeded,
  useImagePaste,
  useTauriFileDrop,
} from "../../lib/desktop";
import { copyImageBlobToClipboard } from "../../lib/clipboard";
import ToolHeader from "../../components/shell/ToolHeader";
import ImageLightbox from "../../components/shell/ImageLightbox";
import CropEditor from "./CropEditor";
import {
  compressToTargetKb,
  detectTransparency,
  type CompressionResult,
} from "./targetCompressor";
import {
  UploadSimple,
  DownloadSimple,
  CheckCircle,
  Check,
  FileArrowDown,
  Trash,
  Crop,
  ShareNetwork,
  ArrowsOut,
  ArrowLeft,
} from "@phosphor-icons/react";

interface TargetSizeAppProps {
  initialTargetKb?: number;
  title?: string;
  subtitle?: string;
  /** Show the Black & White (signature) toggle. Used by the 20KB tool. */
  enableBlackWhite?: boolean;
}

const BG_SWATCHES = ["#ffffff", "#f8fafc", "#000000", "#1e3a8a", "#dc2626", "#16a34a"];

export default function TargetSizeApp({
  initialTargetKb = 50,
  title = "Compress Image to Exact KB",
  subtitle = "Reduce image file size below strict limits for government exam portals, job forms, and visas without losing clarity.",
  enableBlackWhite = false,
}: TargetSizeAppProps) {
  const [targetKb, setTargetKb] = useState<number>(initialTargetKb);
  const [format, setFormat] = useState<"image/jpeg" | "image/webp">("image/jpeg");
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [hasTransparency, setHasTransparency] = useState<boolean>(false);
  const [blackWhite, setBlackWhite] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<boolean>(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const TARGET_PRESETS = [20, 50, 100, 200, 500];
  const ext = format === "image/webp" ? "webp" : "jpg";

  const setWorkingFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setShared(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setSelectedFile(file);
    setHasTransparency(await detectTransparency(file));
  }, []);

  const handleFileChange = useCallback(
    (file: File) => {
      void setWorkingFile(file);
    },
    [setWorkingFile],
  );

  // Desktop adaptation: accept a file dropped from the OS onto the app window.
  useTauriFileDrop((files) => {
    if (files[0]) handleFileChange(files[0]);
  });

  // Desktop: Ctrl+V pastes an image here too, like the main resizer.
  useImagePaste((files) => {
    if (files[0]) handleFileChange(files[0]);
  });

  const handleApplyCrop = useCallback(
    (file: File) => {
      setShowCrop(false);
      void setWorkingFile(file);
    },
    [setWorkingFile],
  );

  const handleCompress = useCallback(async () => {
    if (!selectedFile || processing) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await compressToTargetKb(selectedFile, {
        targetKb,
        format,
        // JPEG has no alpha: flatten transparency over the chosen color.
        // WebP keeps the alpha channel untouched.
        backgroundColor: format === "image/jpeg" ? bgColor : undefined,
        blackWhite,
      });
      setResult(res);
      // Desktop adaptation: the web app's main resizer auto-scrolls to the
      // result — do the same here via the app's scroll container.
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          if (resultRef.current) scrollIntoViewIfNeeded(resultRef.current);
        }, 120);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed");
    } finally {
      setProcessing(false);
    }
  }, [selectedFile, processing, targetKb, format, bgColor, blackWhite]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    try {
      const res = await fetch(result.dataUrl);
      const ok = await copyImageBlobToClipboard(await res.blob());
      setShared(ok);
      if (ok) window.setTimeout(() => setShared(false), 2500);
      else setError("Could not copy the image to the clipboard.");
    } catch {
      setError("Could not copy the image to the clipboard.");
    }
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result?.dataUrl || !selectedFile) return;
    // Surface download failures visibly instead of failing silently — a
    // native dialog that can't open is a bug we want to see, not swallow.
    downloadFile(
      result.dataUrl,
      `shrinkit-${targetKb}kb-${selectedFile.name.replace(/\.[^.]+$/, "")}.${ext}`,
    ).catch((err) =>
      setError(
        err instanceof Error ? `Download failed: ${err.message}` : "Download failed",
      ),
    );
  }, [result, selectedFile, targetKb, ext]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.dataUrl) URL.revokeObjectURL(result.dataUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setShowCrop(false);
    setShared(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const showBgPicker = hasTransparency && format === "image/jpeg" && !blackWhite;

  return (
    <div className="w-full">
      {/* Desktop: compact app header instead of the web hero banner. */}
      <ToolHeader
        icon={<DownloadSimple size={20} weight="bold" />}
        title={title}
        description={subtitle}
      />

      {showCrop && previewUrl && selectedFile ? (
        <CropEditor
          imageUrl={previewUrl}
          fileName={selectedFile.name}
          onApply={handleApplyCrop}
          onCancel={() => setShowCrop(false)}
        />
      ) : !selectedFile ? (
        /* ---------- Step 1: select ---------- */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-tline bg-tsurface p-10 text-center shadow-sm transition hover:border-taccent hover:bg-tsurface2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg,image/heic,image/heif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-taccent/10 text-taccent">
            <UploadSimple size={32} weight="bold" />
          </div>
          <p className="mb-1 text-lg font-semibold text-tink">
            Drop your image here, or <span className="text-taccent underline">browse</span>
          </p>
          <p className="text-xs text-tmuted">
            Supports JPG, PNG, WebP up to 50MB. Target ceiling:{" "}
            <span className="font-semibold text-tink">&lt; {targetKb} KB</span>
          </p>
        </div>
      ) : (
        /* ---------- Step 2: settings / Step 3: result ---------- */
        <>
          {/* Target size + output options */}
          {!result && (
            <div className="mb-5 rounded-2xl border border-tline bg-tsurface p-4 shadow-sm">
              <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-tmuted">
                Target maximum file size
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {TARGET_PRESETS.map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setTargetKb(kb)}
                    className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      targetKb === kb
                        ? "scale-105 bg-taccent text-white shadow-sm"
                        : "border border-tline bg-tsurface text-tink hover:border-taccent hover:bg-tsurface2"
                    }`}
                  >
                    &lt; {kb} KB
                  </button>
                ))}
                <div className="ml-2 flex items-center gap-1">
                  <span className="text-xs text-tmuted">Custom:</span>
                  <input
                    type="number"
                    min="5"
                    max="50000"
                    value={targetKb}
                    onChange={(e) => setTargetKb(Math.max(5, Number(e.target.value) || 5))}
                    className="h-[36px] w-[75px] rounded-[6px] border border-tline bg-tinputbg px-2 text-center text-sm font-medium text-tink outline-none focus:border-taccent"
                  />
                  <span className="text-xs font-semibold text-tink">KB</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-tline pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-tmuted">Output format:</span>
                  <div className="inline-flex rounded-lg border border-tline bg-tsurface2 p-1">
                    {(["image/jpeg", "image/webp"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition ${
                          format === f
                            ? "bg-taccent text-white shadow-sm"
                            : "text-tmuted hover:text-tink"
                        }`}
                      >
                        {f === "image/jpeg" ? "JPG" : "WebP"}
                      </button>
                    ))}
                  </div>
                </div>
                {enableBlackWhite && (
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-tink">
                    <input
                      type="checkbox"
                      checked={blackWhite}
                      onChange={(e) => setBlackWhite(e.target.checked)}
                      className="h-4 w-4 accent-[#016df0]"
                    />
                    Black &amp; White — sharp contrast for signatures &amp; scans
                  </label>
                )}
              </div>

              {showBgPicker && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-tline pt-3">
                  <span className="text-xs font-medium text-tmuted">
                    Transparent background — fill with:
                  </span>
                  {BG_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBgColor(c)}
                      aria-label={`Background ${c}`}
                      className={`h-7 w-7 cursor-pointer rounded-full border transition ${
                        bgColor === c
                          ? "border-taccent ring-2 ring-taccent/40"
                          : "border-black/20 hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    title="Custom color"
                    className="h-7 w-9 cursor-pointer rounded border border-tline bg-transparent p-0.5"
                  />
                </div>
              )}

              <p className="mt-3 text-[11px] text-tmuted">
                100% on-device — your image never leaves this PC. No uploads, no sign-up.
              </p>
            </div>
          )}

          {/* Work card */}
          <div
            ref={result ? resultRef : undefined}
            className="rounded-2xl border border-tline bg-tsurface p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-col items-center gap-8 md:flex-row">
              {/* Preview (click to view fullscreen) */}
              <button
                type="button"
                onClick={() =>
                  setLightboxSrc(result?.dataUrl ?? previewUrl)
                }
                title="View fullscreen"
                className="group relative aspect-square w-full max-w-[280px] shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-tline bg-tsurface2 shadow-inner"
              >
                {result?.dataUrl ? (
                  <img
                    src={result.dataUrl}
                    alt="Compressed output"
                    className="h-full w-full object-contain"
                  />
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected input"
                    className="h-full w-full object-contain"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
                  <ArrowsOut
                    size={22}
                    weight="bold"
                    className="text-white opacity-0 drop-shadow transition group-hover:opacity-100"
                  />
                </span>
                {processing && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white backdrop-blur-sm">
                    Optimizing to {targetKb} KB...
                  </span>
                )}
              </button>

              {/* Details & actions */}
              <div className="w-full flex-1 space-y-4">
                <div className="flex items-center justify-between border-b border-tline pb-3">
                  <span className="max-w-[200px] truncate text-sm font-semibold text-tink">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs text-tmuted transition hover:text-terror"
                  >
                    <Trash size={14} />
                    <span>Clear</span>
                  </button>
                </div>

                {result ? (
                  <>
                    {/* Size comparison */}
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-tline bg-tsurface2 p-4">
                      <div>
                        <span className="block text-xs text-tmuted">Original File</span>
                        <span className="text-base font-semibold text-tink">
                          {formatBytes(result.originalBytes)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-tmuted">Compressed</span>
                        <span className="text-base font-bold text-taccent">
                          {formatBytes(result.outputBytes)}
                        </span>
                        <span className="ml-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {/* A tiny flat image can legitimately grow when
                              re-encoded under the ceiling — show + then. */}
                          ({result.outputBytes <= result.originalBytes ? "-" : "+"}
                          {Math.abs(
                            Math.round(
                              (1 - result.outputBytes / result.originalBytes) * 100,
                            ),
                          )}
                          %)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle size={16} weight="fill" />
                      <span>
                        Guaranteed strictly under {targetKb} KB (
                        {result.outputBytes.toLocaleString()} bytes) · {result.width}×
                        {result.height} px · {ext.toUpperCase()} · quality {result.qualityUsed}
                      </span>
                    </div>
                    {error && <p className="text-xs font-medium text-terror">{error}</p>}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-tbtna px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0257bf]"
                      >
                        <DownloadSimple size={18} weight="bold" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleShare()}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-tline px-5 py-3 text-sm font-medium text-tink transition hover:bg-tsurface2"
                      >
                        {shared ? (
                          <Check size={18} weight="bold" className="text-emerald-600" />
                        ) : (
                          <ShareNetwork size={18} />
                        )}
                        <span>{shared ? "Copied!" : "Share"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (result?.dataUrl) URL.revokeObjectURL(result.dataUrl);
                          setResult(null);
                          setError(null);
                        }}
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-tline px-4 py-3 text-sm font-medium text-tink transition hover:bg-tsurface2"
                      >
                        <ArrowLeft size={18} />
                        <span>Back to Edit</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg,image/heic,image/heif"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {previewUrl && (
                      <div className="rounded-xl border border-tline bg-tsurface2 p-4 text-xs">
                        <div className="flex justify-between">
                          <span className="text-tmuted">Input size:</span>
                          <span className="font-semibold text-tink">
                            {formatBytes(selectedFile.size)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex justify-between">
                          <span className="text-tmuted">Target:</span>
                          <span className="font-semibold text-tink">&lt; {targetKb} KB</span>
                        </div>
                        <div className="mt-1.5 flex justify-between">
                          <span className="text-tmuted">Output format:</span>
                          <span className="font-semibold text-tink">{ext.toUpperCase()}</span>
                        </div>
                      </div>
                    )}
                    {error && <p className="text-xs font-medium text-terror">{error}</p>}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCompress}
                        disabled={processing}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-tbtna px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0257bf] disabled:opacity-60"
                      >
                        <DownloadSimple size={18} weight="bold" />
                        <span>{processing ? "Compressing..." : `Compress to ${targetKb} KB`}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCrop(true)}
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-tline px-4 py-3 text-sm font-medium text-tink transition hover:bg-tsurface2"
                      >
                        <Crop size={18} />
                        <span>Crop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-tline px-4 py-3 text-sm font-medium text-tink transition hover:bg-tsurface2"
                      >
                        <FileArrowDown size={18} />
                        <span>Change Photo</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg,image/heic,image/heif"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={result ? "Compressed output" : "Selected image"}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}

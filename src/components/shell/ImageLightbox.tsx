import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * Fullscreen image viewer.
 *
 * Opens over the whole window with a dimmed, blurred backdrop; the image
 * fades/scales in using the app's existing animate-in pattern. Closes via
 * the X button, a backdrop click, or the Escape key.
 */
export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
      >
        <X size={20} weight="bold" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="animate-in fade-in zoom-in-95 max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        style={{ animationDuration: "220ms" }}
      />
    </div>
  );
}

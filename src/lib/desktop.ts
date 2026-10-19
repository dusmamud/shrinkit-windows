import { useEffect, useRef } from "react";

/** True when running inside the Tauri WebView (as opposed to `vite dev`). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

function fileFromPath(path: string, bytes: Uint8Array): File {
  const name = path.split(/[/\\]/).pop() || "image";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  // Copy into a fresh ArrayBuffer: `new File` needs a clean, detached-safe buffer.
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return new File([buf], name, { type: EXT_MIME[ext] ?? "application/octet-stream" });
}

/**
 * Desktop adaptation: forward OS-level file drops (e.g. Explorer -> app
 * window) into a tool's existing file-adding function.
 *
 * In Tauri v2 the WebView never receives native File objects for OS drops,
 * so we listen to the `tauri://drag-drop` event and read the dropped paths
 * through the fs plugin instead. No-op in a plain browser.
 */
export function useTauriFileDrop(onFiles: (files: File[]) => void): void {
  // Always call the latest callback without resubscribing on every render.
  const callbackRef = useRef(onFiles);
  callbackRef.current = onFiles;

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      if (cancelled) return;
      unlisten = await listen<{ paths: string[] }>(
        "tauri://drag-drop",
        async (event) => {
          const files: File[] = [];
          for (const p of event.payload.paths) {
            try {
              files.push(fileFromPath(p, await readFile(p)));
            } catch {
              // Skip unreadable paths; the tool surfaces its own errors.
            }
          }
          if (files.length > 0) callbackRef.current(files);
        },
      );
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}

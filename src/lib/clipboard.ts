import { isTauri } from "./desktop";

/** Convert any image blob to PNG (the clipboard standard). */
export async function toPngBlob(blob: Blob): Promise<Blob | null> {
  if (blob.type === "image/png") return blob;
  const imgBitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = imgBitmap.width;
  canvas.height = imgBitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    imgBitmap.close();
    return null;
  }
  ctx.drawImage(imgBitmap, 0, 0);
  imgBitmap.close();
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
}

/**
 * Copy an image blob to the system clipboard.
 *
 * Desktop adaptation: the WebView's Async Clipboard API is unreliable for
 * images inside Tauri, so the desktop app writes RGBA pixels through the
 * native clipboard-manager plugin instead. Browsers keep the standard
 * ClipboardItem path.
 */
export async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  if (isTauri()) {
    try {
      const pngBlob = await toPngBlob(blob);
      if (!pngBlob) return false;
      const bmp = await createImageBitmap(pngBlob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        bmp.close();
        return false;
      }
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { writeImage } = await import(
        "@tauri-apps/plugin-clipboard-manager"
      );
      const { Image } = await import("@tauri-apps/api/image");
      const image = await Image.new(
        new Uint8Array(data.data),
        data.width,
        data.height,
      );
      await writeImage(image);
      return true;
    } catch (err) {
      console.error("[ShrinkIt] Failed to copy image to clipboard:", err);
      return false;
    }
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    !("write" in navigator.clipboard)
  ) {
    return false;
  }
  try {
    const pngBlob = await toPngBlob(blob);
    if (!pngBlob) return false;
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngBlob }),
    ]);
    return true;
  } catch (err) {
    console.error("[ShrinkIt] Failed to copy image to clipboard:", err);
    return false;
  }
}

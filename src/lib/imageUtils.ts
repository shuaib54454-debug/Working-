/**
 * Client-side Image Preprocessing & Compression Utility.
 * Uses short-lived in-memory Data URLs only for image decoding/compression;
 * callers must not persist the returned value in browser storage.
 */
export interface CompressImageOptions { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string; }

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64 = ""] = dataUrl.split(",", 2);
  const mime = header.match(/^data:([^;]+)/i)?.[1] || "application/octet-stream";
  const binary = atob(base64); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function compressImage(source: string | File | Blob, options?: CompressImageOptions): Promise<string>;
export function compressImage(source: string | File | Blob, maxWidth: number, quality: number): Promise<Blob>;
export function compressImage(source: string | File | Blob, optionsOrMaxWidth: CompressImageOptions | number = {}, legacyQuality?: number): Promise<string | Blob> {
  const legacyBlobMode = typeof optionsOrMaxWidth === "number";
  const options: CompressImageOptions = legacyBlobMode ? { maxWidth: optionsOrMaxWidth, maxHeight: optionsOrMaxWidth, quality: legacyQuality ?? 0.85, mimeType: "image/jpeg" } : optionsOrMaxWidth;
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.85, mimeType = "image/jpeg" } = options;
  return new Promise((resolve, reject) => {
    const finish = (dataUrl: string) => resolve(legacyBlobMode ? dataUrlToBlob(dataUrl) : dataUrl);
    const loadDataUrl = (dataUrl: string) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
          else { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        const canvas = document.createElement("canvas"); canvas.width = Math.max(width, 1); canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext("2d");
        if (!ctx) { finish(dataUrl); return; }
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try { finish(canvas.toDataURL(mimeType, quality)); } catch { finish(dataUrl); }
      };
      img.onerror = () => finish(dataUrl); img.src = dataUrl;
    };
    if (typeof source === "string") { loadDataUrl(source); return; }
    const reader = new FileReader();
    reader.onload = event => { const result = event.target?.result; if (typeof result === "string" && result) loadDataUrl(result); else reject(new Error("Failed to read image file")); };
    reader.onerror = () => reject(new Error("Failed to read image file")); reader.readAsDataURL(source);
  });
}

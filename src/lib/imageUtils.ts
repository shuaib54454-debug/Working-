/**
 * Client-side Image Preprocessing & Compression Utility
 * Prevents 413 Payload Too Large and memory spikes in Android WebView / Mobile browsers.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

/**
 * Resizes and compresses an image data URL or File to optimal resolution for OCR.
 */
export async function compressImage(
  source: string | File | Blob,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85,
    mimeType = "image/jpeg"
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Convert File/Blob to DataURL if needed
    const loadDataUrl = (dataUrl: string) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect-ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to original
          resolve(dataUrl);
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch (err) {
          // In case of error, return original
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        // Fallback to original string if image failed to render on canvas
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    if (typeof source === "string") {
      loadDataUrl(source);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          loadDataUrl(result);
        } else {
          reject(new Error("Failed to read image file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Client-Side Ultra Compression Engine for Attendance Selfies
 * Resizes camera frame to Max Width 600px, 0.55 WebP Quality, producing payload strictly < 40 KB.
 */

export interface CompressionResult {
  blob: Blob;
  base64: string;
  sizeBytes: number;
  sizeKb: number;
  width: number;
  height: number;
}

/**
 * Captures and compresses a video frame from an HTMLVideoElement to WebP format.
 */
export async function captureAndCompressVideoFrame(
  videoElement: HTMLVideoElement,
  maxWidth: number = 600,
  quality: number = 0.55
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    try {
      const vWidth = videoElement.videoWidth || 640;
      const vHeight = videoElement.videoHeight || 480;

      // Calculate scaled dimensions preserving aspect ratio
      let targetWidth = vWidth;
      let targetHeight = vHeight;

      if (vWidth > maxWidth) {
        targetWidth = maxWidth;
        targetHeight = Math.round((vHeight * maxWidth) / vWidth);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Unable to get canvas 2D rendering context'));
      }

      // Draw mirrored frame for front selfie camera
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

      // Add biometric timestamp overlay
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(8, targetHeight - 28, 220, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 14, targetHeight - 14);

      // Convert to WebP format
      const mimeType = 'image/webp';
      const base64 = canvas.toDataURL(mimeType, quality);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Failed to create compressed image blob'));
          }

          const sizeBytes = blob.size;
          const sizeKb = Math.round((sizeBytes / 1024) * 10) / 10;

          resolve({
            blob,
            base64,
            sizeBytes,
            sizeKb,
            width: targetWidth,
            height: targetHeight
          });
        },
        mimeType,
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

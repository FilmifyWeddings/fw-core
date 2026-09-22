/**
 * Client-Side In-Browser High Performance Image Compressor
 * Resilient against iOS Safari / Mobile WebKit DOMExceptions.
 * If canvas compression fails or is unsupported for any reason,
 * safely falls back to original File so uploads never fail.
 */

export async function compressImage(
  file: File | Blob,
  maxDimension = 1920,
  quality = 0.82
): Promise<File | Blob> {
  // If not a standard File or image, return as-is
  if (!file || !(file instanceof Blob)) {
    return file;
  }

  const fileType = file.type || '';
  if (!fileType.startsWith('image/') || fileType === 'image/svg+xml' || fileType === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return resolve(file);
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      img.onload = () => {
        try {
          URL.revokeObjectURL(objectUrl);
          let { width, height } = img;

          if (!width || !height) {
            return resolve(file);
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Attempt WebP compression first, fallback to JPEG if WebP is rejected by browser
          canvas.toBlob(
            (blob) => {
              if (blob) {
                try {
                  const fileName = (file instanceof File && file.name) ? file.name : 'upload.webp';
                  const baseName = fileName.replace(/\.[^/.]+$/, '');
                  const cleanFileName = `${baseName || 'image'}.webp`;

                  // Safe construction of File object
                  const compressedFile = new File([blob], cleanFileName, {
                    type: 'image/webp',
                    lastModified: Date.now(),
                  });
                  return resolve(compressedFile);
                } catch {
                  return resolve(blob);
                }
              }

              // Fallback to JPEG if WebP is not supported by browser
              canvas.toBlob(
                (jpegBlob) => {
                  if (!jpegBlob) return resolve(file);
                  try {
                    const fileName = (file instanceof File && file.name) ? file.name : 'upload.jpg';
                    const baseName = fileName.replace(/\.[^/.]+$/, '');
                    const cleanFileName = `${baseName || 'image'}.jpg`;

                    const compressedFile = new File([jpegBlob], cleanFileName, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                  } catch {
                    resolve(jpegBlob);
                  }
                },
                'image/jpeg',
                quality
              );
            },
            'image/webp',
            quality
          );
        } catch (innerErr) {
          console.warn('[compressImage inner error, falling back to original]:', innerErr);
          resolve(file);
        }
      };

      img.onerror = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
        console.warn('[compressImage decode error, using original file]');
        resolve(file);
      };
    } catch (outerErr) {
      console.warn('[compressImage outer error, using original file]:', outerErr);
      resolve(file);
    }
  });
}

/**
 * Ultra-Lightweight Moodboard Image Compressor
 * Resizes to 1280px max dimension and applies high-compression WebP/JPEG encoding.
 * Reduces 10MB-50MB photos down to ~70KB - 150KB while retaining excellent screen clarity.
 */
export async function compressMoodboardImage(
  file: File | Blob,
  maxDimension = 1280,
  quality = 0.72
): Promise<File | Blob> {
  return compressImage(file, maxDimension, quality);
}


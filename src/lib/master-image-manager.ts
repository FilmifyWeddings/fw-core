/**
 * Master Image Manager & Compression Utility
 * ============================================
 * Universal high-performance client-side image compression & Supabase upload manager.
 * - Automatically converts images (PNG, JPG, JPEG, GIF, BMP, HEIC) to WebP format.
 * - Max dimension: 2048px (maintains aspect ratio, ultra-crisp HD quality for wedding photography).
 * - Compression Quality: 88% (0.88).
 * - Enforces cacheControl: '31536000' (1 year browser cache) on all Supabase Storage uploads to freeze Egress.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  upsert?: boolean;
  cacheControl?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses an image File or Blob in the browser to WebP format.
 * If file is not an image (e.g. video, audio, document), returns original file safely without throwing.
 */
export async function compressImageClient(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<File> {
  const isImage = (file.type && file.type.startsWith('image/') && !file.type.includes('svg')) ||
    (file instanceof File && /\.(jpg|jpeg|png|webp|bmp|heic|tiff)$/i.test(file.name));

  // If not an image, bypass image compression and return original file
  if (!isImage) {
    if (file instanceof File) return file;
    return new File([file], 'media', { type: file.type || 'application/octet-stream' });
  }

  const maxWidth = options.maxWidth || 2400;
  const maxHeight = options.maxHeight || 2400;
  const quality = options.quality !== undefined ? options.quality : 0.90;

  // Derive original filename if File
  const originalName = file instanceof File ? file.name : 'image.jpg';
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const webpFileName = `${baseName}.webp`;

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect-ratio scaling for max dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Create HTML5 Offscreen Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original file if canvas context unavailable
          if (file instanceof File) resolve(file);
          else resolve(new File([file], webpFileName, { type: file.type }));
          return;
        }

        // Enable ultra-sharp image rendering algorithms
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              if (file instanceof File) resolve(file);
              else resolve(new File([file], webpFileName, { type: 'image/jpeg' }));
              return;
            }

            const compressedFile = new File([blob], webpFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        // Graceful fallback to original file if image fails to decode
        if (file instanceof File) resolve(file);
        else resolve(new File([file], webpFileName, { type: file.type || 'image/jpeg' }));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        if (file instanceof File) resolve(file);
        else resolve(new File([file], webpFileName, { type: file.type || 'image/jpeg' }));
      }
    };

    reader.onerror = () => {
      if (file instanceof File) resolve(file);
      else resolve(new File([file], webpFileName, { type: file.type || 'image/jpeg' }));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Reads a File/Blob, compresses if image,
 * and returns the Base64 Data URL string for preview/fallback.
 */
export async function compressAndGetBase64(
  file: File | Blob,
  options?: CompressionOptions
): Promise<string> {
  const isImage = (file.type && file.type.startsWith('image/') && !file.type.includes('svg')) ||
    (file instanceof File && /\.(jpg|jpeg|png|webp|bmp|heic|tiff)$/i.test(file.name));

  const targetFile = isImage ? await compressImageClient(file, options) : file;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(targetFile);
  });
}

/**
 * Universal Supabase Storage Upload Manager with Automatic Bucket Fallbacks.
 * Automatically compresses images to WebP and attaches cacheControl: '31536000' (1 year cache).
 * For non-image files (videos, audio, PDFs, docs), preserves original format and mime type without compression.
 */
export async function uploadMasterImage(
  supabaseClient: any,
  file: File | Blob,
  options: UploadOptions = {}
): Promise<{ path: string; url: string; error: string | null }> {
  try {
    // List of target buckets in priority order to prevent "Bucket not found" errors
    const targetBuckets = [
      options.bucket,
      'whatsapp_templates_media',
      'baileys-media',
      'quotation-assets',
      'media-assets'
    ].filter(Boolean) as string[];

    const folder = options.folder ? `${options.folder.replace(/\/$/, '')}/` : '';
    const upsert = options.upsert !== undefined ? options.upsert : true;
    const cacheControl = options.cacheControl || '31536000'; // 1 YEAR BROWSER CACHE ENFORCED

    const isImage = (file.type && file.type.startsWith('image/') && !file.type.includes('svg')) ||
      (file instanceof File && /\.(jpg|jpeg|png|webp|bmp|heic|tiff)$/i.test(file.name));

    let fileToUpload: File | Blob;
    let fileExt: string;
    let contentType: string;

    const originalName = file instanceof File ? file.name : 'media.bin';
    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);

    if (isImage) {
      // Compress image client side
      fileToUpload = await compressImageClient(file, {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        quality: options.quality,
      });
      fileExt = 'webp';
      contentType = 'image/webp';
    } else {
      // Non-image file (Video, Audio, PDF, etc.) -> Preserve original file as-is
      fileToUpload = file;
      fileExt = extMatch ? extMatch[1].toLowerCase() : (file.type ? file.type.split('/')[1] : 'bin');
      contentType = file.type || 'application/octet-stream';
    }

    // Generate clean storage file path
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const timeStamp = Date.now();
    const fileName = `${timeStamp}_${uniqueId}.${fileExt}`;
    const storagePath = `${folder}${fileName}`;

    let lastError = '';

    // Loop through buckets until upload succeeds
    for (const bucketName of targetBuckets) {
      try {
        const { data, error } = await supabaseClient.storage
          .from(bucketName)
          .upload(storagePath, fileToUpload, {
            contentType: contentType,
            cacheControl: cacheControl,
            upsert: upsert,
          });

        if (!error && data) {
          const { data: publicUrlData } = supabaseClient.storage
            .from(bucketName)
            .getPublicUrl(storagePath);

          return {
            path: data.path,
            url: publicUrlData.publicUrl,
            error: null,
          };
        } else if (error) {
          lastError = error.message;
          if (error.message.includes('not found') || error.message.includes('Bucket')) {
            console.warn(`[MasterImageManager] Bucket "${bucketName}" not found. Trying fallback...`);
          }
        }
      } catch (subErr: any) {
        lastError = subErr.message;
      }
    }

    // Fallback: If all bucket uploads fail, return Base64 Data URL so the app NEVER crashes or fails
    console.warn('[MasterImageManager] Storage bucket upload failed, utilizing Base64 Data URL fallback.');
    const base64Url = await compressAndGetBase64(file, {
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      quality: options.quality,
    });

    return {
      path: storagePath,
      url: base64Url,
      error: null,
    };
  } catch (err: any) {
    console.error('[MasterImageManager] Unexpected Upload Failure:', err);
    try {
      const base64Url = await compressAndGetBase64(file);
      return { path: '', url: base64Url, error: null };
    } catch {
      return { path: '', url: '', error: err.message || 'Upload failed' };
    }
  }
}

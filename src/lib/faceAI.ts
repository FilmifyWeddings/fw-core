/**
 * StudioCore Multi-Face AI Engine
 * Production-grade multi-face detection, 512-dimensional vector embedding extraction,
 * and high-accuracy cosine similarity matching.
 */

export interface DetectedFace {
  box: { x: number; y: number; w: number; h: number };
  embedding: number[]; // 512-dimensional normalized vector
  confidence?: number;
}

const WORKER_ENDPOINTS = [
  process.env.FACE_WORKER_URL,
  'http://127.0.0.1:8005/api/ai/extract-faces',
  'http://143.244.133.235:8005/api/ai/extract-faces',
].filter(Boolean) as string[];

/**
 * Normalizes a 512-D vector to unit length (L2 norm)
 */
export function normalizeVector(vec: number[]): number[] {
  if (!vec || !Array.isArray(vec) || vec.length === 0) return [];
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec;
  return vec.map(v => v / norm);
}

/**
 * Calculates Cosine Similarity between two 512-D normalized vectors (range: 0.0 to 1.0)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== 512 || b.length !== 512) return 0;
  let dot = 0;
  for (let i = 0; i < 512; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, dot));
}

/**
 * Extracts multiple faces and 512-D embeddings from an image URL or buffer
 */
export async function extractFacesFromImageUrl(imageUrl: string): Promise<DetectedFace[]> {
  if (!imageUrl) return [];

  // 1. Fetch image buffer in Node.js first to prevent Python network fetch issues
  let base64Payload: string | null = null;
  try {
    const imgRes = await fetch(imageUrl);
    if (imgRes.ok) {
      const arrayBuf = await imgRes.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      base64Payload = `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
  } catch (fetchErr) {
    console.warn('[FaceAI] Could not fetch image buffer locally:', fetchErr);
  }

  // 2. Query InsightFace AI worker
  for (const endpoint of WORKER_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const requestBody = base64Payload
        ? { image_base64: base64Payload, image_url: imageUrl }
        : { image_url: imageUrl };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const rawFaces = json.faces || json.data?.faces;
        if (rawFaces && Array.isArray(rawFaces) && rawFaces.length > 0) {
          return rawFaces.map((f: any) => ({
            box: f.box || { x: 0, y: 0, w: 100, h: 100 },
            embedding: normalizeVector(f.embedding),
            confidence: f.confidence || 0.95,
          }));
        }
      }
    } catch (err: any) {
      console.warn(`[FaceAI] Worker ${endpoint} error:`, err.message);
    }
  }

  return [];
}

/**
 * Extracts 512-D vector from guest selfie Base64 using InsightFace Neural Network
 */
export async function extractEmbeddingFromBase64(base64Data: string): Promise<number[]> {
  if (!base64Data) return [];

  // Query InsightFace Deep Engine with base64
  for (const endpoint of WORKER_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Data, selfieBase64: base64Data }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const rawFaces = json.faces || json.data?.faces;
        if (rawFaces && Array.isArray(rawFaces) && rawFaces.length > 0) {
          return normalizeVector(rawFaces[0].embedding);
        }
      }
    } catch (err: any) {
      console.warn(`[FaceAI] Worker ${endpoint} base64 error:`, err.message);
    }
  }

  return [];
}

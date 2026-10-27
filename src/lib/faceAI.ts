import { getGalleryObjectBuffer } from '@/lib/storage/galleryB2Client';

export interface DetectedFace {
  box: { x: number; y: number; w: number; h: number };
  embedding: number[]; // 512-dimensional normalized vector
  confidence?: number;
}

const MODAL_FACE_ENDPOINT = 'https://sushantnawale700--studiocore-face-service-studiocoreface-909b81.us-east.modal.run/api/ai/extract-faces';
const MODAL_FACE_BATCH_ENDPOINT = 'https://sushantnawale700--studiocore-face-service-studiocoreface-909b81.us-east.modal.run/api/ai/extract-faces-batch';

const WORKER_ENDPOINTS = [
  process.env.FACE_WORKER_URL,
  MODAL_FACE_ENDPOINT,
].filter(Boolean) as string[];

const CLUSTER_ENDPOINTS = [
  process.env.FACE_CLUSTER_URL,
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
 * Extracts multiple faces and 512-D embeddings directly from Base64 image payload
 */
export async function extractFacesFromBase64(base64Payload: string): Promise<DetectedFace[]> {
  if (!base64Payload) return [];

  for (const endpoint of WORKER_ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s to allow for Modal cold starts

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64Payload }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const rawFaces = json.faces || json.data?.faces;
          if (rawFaces && Array.isArray(rawFaces)) {
            return rawFaces.map((f: any) => ({
              box: f.box || { x: 0, y: 0, w: 100, h: 100 },
              embedding: normalizeVector(f.embedding),
              confidence: f.confidence || 0.95,
            }));
          }
        }
      } catch (err: any) {
        console.warn(`[FaceAI] Worker ${endpoint} attempt ${attempt}/2 error:`, err.message);
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  }

  return [];
}

/**
 * Extracts multiple faces and 512-D embeddings directly from S3 Storage Key
 * Bypasses public internet URLs and authentication failures with zero 401 errors.
 */
export async function extractFacesFromS3Key(key: string): Promise<DetectedFace[]> {
  if (!key) return [];
  try {
    const buf = await getGalleryObjectBuffer(key);
    if (!buf) {
      console.warn(`[FaceAI] Could not retrieve S3 buffer for key: ${key}`);
      return [];
    }
    const base64Payload = `data:image/jpeg;base64,${buf.toString('base64')}`;
    return await extractFacesFromBase64(base64Payload);
  } catch (err: any) {
    console.warn(`[FaceAI] extractFacesFromS3Key failed for key ${key}:`, err.message);
    return [];
  }
}

/**
 * Rule 2 & Rule 3: Extracts faces for multiple photos in a single high-speed batch call on NVIDIA L4 GPU.
 * Bypasses sequential latency and optimizes GPU tensor parallelism.
 */
export async function extractFacesBatchFromS3Keys(
  items: Array<{ id: string; key: string }>
): Promise<Map<string, DetectedFace[]>> {
  const resultMap = new Map<string, DetectedFace[]>();
  if (!items || items.length === 0) return resultMap;

  // 1. Download image buffers in parallel from Cloud Storage
  const payloadItems: Array<{ id: string; image_base64: string }> = [];
  await Promise.all(
    items.map(async (item) => {
      try {
        if (!item.key) return;
        const buf = await getGalleryObjectBuffer(item.key);
        if (buf && buf.length > 0) {
          payloadItems.push({
            id: item.id,
            image_base64: `data:image/jpeg;base64,${buf.toString('base64')}`,
          });
        }
      } catch (err: any) {
        console.warn(`[FaceAI] Failed to fetch buffer for item ${item.id} (${item.key}):`, err.message);
      }
    })
  );

  if (payloadItems.length === 0) return resultMap;

  // 2. Send batch to Modal GPU
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const res = await fetch(MODAL_FACE_BATCH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payloadItems }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.results)) {
        for (const r of json.results) {
          if (r.id && Array.isArray(r.faces)) {
            const detected = r.faces.map((f: any) => ({
              box: f.box || { x: 0, y: 0, w: 100, h: 100 },
              embedding: normalizeVector(f.embedding),
              confidence: f.confidence || 0.95,
            }));
            resultMap.set(r.id, detected);
          }
        }
        return resultMap;
      }
    }
  } catch (batchErr: any) {
    console.warn('[FaceAI] Batch endpoint failed, falling back to parallel single worker:', batchErr.message);
  }

  // 3. Resilient Fallback: Process individually if batch endpoint fails
  await Promise.all(
    payloadItems.map(async (item) => {
      try {
        const faces = await extractFacesFromBase64(item.image_base64);
        resultMap.set(item.id, faces);
      } catch (err) {
        resultMap.set(item.id, []);
      }
    })
  );

  return resultMap;
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

  if (base64Payload) {
    return await extractFacesFromBase64(base64Payload);
  }

  // 2. Query InsightFace AI worker with URL
  for (const endpoint of WORKER_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
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

  const faces = await extractFacesFromBase64(base64Data);
  if (faces.length > 0) {
    return faces[0].embedding;
  }
  return [];
}

/**
 * Clusters an array of faces into unique people identities using DBSCAN (Python)
 * or intelligent Union-Find connected component graph clustering (Fallback).
 * Prevents duplicating the same person across angles/lighting.
 */
export async function clusterFacesWithAI(
  faces: any[],
  eps = 0.48
): Promise<{ success: boolean; people: any[]; uniquePeopleCount: number }> {
  if (!faces || faces.length === 0) {
    return { success: true, people: [], uniquePeopleCount: 0 };
  }

  // 1. Try Python DBSCAN microservice
  for (const endpoint of CLUSTER_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faces, eps }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.people)) {
          return {
            success: true,
            people: json.people,
            uniquePeopleCount: json.unique_people_count ?? json.people.length,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[FaceAI] Python cluster endpoint ${endpoint} failed, trying fallback:`, err.message);
    }
  }

  // 2. High-Accuracy Fallback: Union-Find Connected Component Graph Clustering
  console.log('[FaceAI] Using Union-Find Connected Components Graph Clustering...');
  return clusterFacesGraph(faces, 0.48);
}

/**
 * Union-Find Disjoint Set Clustering Algorithm
 * Guarantees that any faces linked through intermediate angles (Face A <-> Face B <-> Face C)
 * are cleanly merged into the same unique person, completely preventing split/duplicate profiles!
 */
export function clusterFacesGraph(
  faces: any[],
  threshold = 0.48
): { success: boolean; people: any[]; uniquePeopleCount: number } {
  const n = faces.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] === i) return i;
    return (parent[i] = find(parent[i]));
  }

  function union(i: number, j: number) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  // Pairwise similarity chaining
  for (let i = 0; i < n; i++) {
    const embI = faces[i].embedding;
    if (!embI || embI.length !== 512) continue;

    for (let j = i + 1; j < n; j++) {
      const embJ = faces[j].embedding;
      if (!embJ || embJ.length !== 512) continue;

      const sim = cosineSimilarity(embI, embJ);
      if (sim >= threshold) {
        union(i, j);
      }
    }
  }

  // Group into clusters
  const clusterMap = new Map<number, { faces: any[]; photoIds: Set<string> }>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusterMap.has(root)) {
      clusterMap.set(root, { faces: [], photoIds: new Set() });
    }
    const c = clusterMap.get(root)!;
    c.faces.push(faces[i]);
    if (faces[i].photo_id) {
      c.photoIds.add(faces[i].photo_id);
    }
  }

  const people: any[] = [];
  let pIdx = 1;

  for (const [, c] of clusterMap.entries()) {
    // Representative face is the one with best confidence or biggest area
    let bestFace = c.faces[0];
    let maxArea = 0;

    for (const f of c.faces) {
      const box = f.bounding_box || f.box || { w: 0, h: 0 };
      const area = (box.w || 0) * (box.h || 0);
      if (area > maxArea) {
        maxArea = area;
        bestFace = f;
      }
    }

    people.push({
      person_id: `person_${pIdx++}`,
      avatar_face: bestFace,
      photo_ids: Array.from(c.photoIds),
      total_photos: c.photoIds.size,
      face_count: c.faces.length,
    });
  }

  people.sort((a, b) => b.total_photos - a.total_photos);

  return {
    success: true,
    people,
    uniquePeopleCount: people.length,
  };
}

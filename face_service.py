import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
import urllib.request
import base64
import cv2
import os
import insightface
from insightface.app import FaceAnalysis

app = FastAPI(title='StudioCore DeepFace AI Engine')

# Initialize buffalo_sc deep learning face recognition
try:
    ai_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    ai_app.prepare(ctx_id=0, det_size=(640, 640))
    engine_ready = True
    print('InsightFace Buffalo-SC Deep Engine Initialized Successfully')
except Exception as e:
    print('InsightFace init error:', e)
    ai_app = None
    engine_ready = False

class ExtractRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    selfieBase64: Optional[str] = None

@app.get('/health')
def health():
    return {'status': 'healthy', 'engine': 'insightface_arcface_512' if engine_ready else 'offline'}

@app.post('/api/ai/extract-faces')
def extract_faces(req: ExtractRequest):
    try:
        img = None
        b64_data = req.image_base64 or req.selfieBase64

        if b64_data:
            clean_b64 = b64_data.split(',')[-1]
            img_bytes = base64.b64decode(clean_b64)
            img_array = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        elif req.image_url:
            req_headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StudioCore-AI/1.0'}
            request = urllib.request.Request(req.image_url, headers=req_headers)
            resp = urllib.request.urlopen(request, timeout=15)
            img_array = np.asarray(bytearray(resp.read()), dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if img is None or ai_app is None:
            return {'status': 'success', 'faces': [], 'count': 0}

        faces = ai_app.get(img)
        results = []

        for face in faces:
            # Allow faces with det_score >= 0.25 (catches side profiles, tilted heads, laughing, and partial faces)
            if hasattr(face, 'det_score') and face.det_score < 0.25:
                continue

            # 512-D ArcFace normalized embedding
            norm = np.linalg.norm(face.embedding)
            if norm > 0:
                embedding = (face.embedding / norm).tolist()
            else:
                embedding = face.embedding.tolist()

            box = [int(v) for v in face.bbox]

            results.append({
                'box': {'x': box[0], 'y': box[1], 'w': box[2] - box[0], 'h': box[3] - box[1]},
                'confidence': float(face.det_score) if hasattr(face, 'det_score') else 0.95,
                'embedding': embedding
            })

        # Sort faces so the largest / most prominent face is first
        results.sort(key=lambda f: f['box']['w'] * f['box']['h'], reverse=True)

        return {'status': 'success', 'faces': results, 'count': len(results)}
    except Exception as e:
        print('Extract error:', e)
        return {'status': 'error', 'message': str(e), 'faces': [], 'count': 0}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8005, log_level='info')

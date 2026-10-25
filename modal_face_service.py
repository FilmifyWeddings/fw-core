import os
import urllib.request
import base64
import numpy as np
import cv2
import modal
from pydantic import BaseModel
from typing import Optional, List

# 1. Initialize Modal App
app = modal.App("studiocore-face-service")

# 2. Define GPU Docker Image with CUDA & cuDNN Libraries
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "numpy<2",
        "opencv-python-headless",
        "insightface>=0.7.3",
        "onnxruntime-gpu",
        "torch",
        "fastapi",
        "requests",
    )
    .env({
        "LD_LIBRARY_PATH": (
            "/usr/local/lib/python3.11/site-packages/nvidia/cudnn/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/cublas/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/cuda_runtime/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/cufft/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/curand/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/cusolver/lib:"
            "/usr/local/lib/python3.11/site-packages/nvidia/cusparse/lib"
        )
    })
    .run_commands(
        # Pre-download InsightFace buffalo_sc model weights at image build time
        "python3 -c \"import insightface; app = insightface.app.FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider']); app.prepare(ctx_id=-1)\""
    )
)

class ExtractRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    selfieBase64: Optional[str] = None

# 3. GPU Worker Class running on NVIDIA L4 with CUDA
@app.cls(
    gpu="L4",
    image=image,
    scaledown_window=120,
)
class StudioCoreFaceService:
    @modal.enter()
    def setup(self):
        import insightface
        import onnxruntime as ort
        print("[StudioCore AI] Initializing InsightFace on NVIDIA L4 GPU...")
        print("[StudioCore AI] Available ONNX Providers:", ort.get_available_providers())

        # Initialize InsightFace with CUDA GPU Execution Provider
        self.ai_app = insightface.app.FaceAnalysis(
            name="buffalo_sc",
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
        )
        self.ai_app.prepare(ctx_id=0, det_size=(640, 640))
        print("[StudioCore AI] InsightFace Buffalo-SC GPU Engine Ready with CUDA on NVIDIA L4!")

    @modal.asgi_app()
    def web(self):
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware

        web_app = FastAPI(title="StudioCore GPU AI Face Scanner")

        web_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @web_app.get("/health")
        def health():
            return {
                "status": "healthy",
                "gpu": "NVIDIA L4",
                "provider": "CUDAExecutionProvider",
                "engine": "insightface_arcface_512"
            }

        @web_app.post("/api/ai/extract-faces")
        def extract_faces_endpoint(req: ExtractRequest):
            try:
                img = None
                b64_data = req.image_base64 or req.selfieBase64

                if b64_data:
                    clean_b64 = b64_data.split(",")[-1]
                    img_bytes = base64.b64decode(clean_b64)
                    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
                    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                elif req.image_url:
                    req_headers = {"User-Agent": "Mozilla/5.0 StudioCore-AI/1.0"}
                    request = urllib.request.Request(req.image_url, headers=req_headers)
                    resp = urllib.request.urlopen(request, timeout=15)
                    img_array = np.asarray(bytearray(resp.read()), dtype=np.uint8)
                    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

                if img is None or self.ai_app is None:
                    return {"status": "success", "faces": [], "count": 0}

                # Run GPU Face Analysis
                faces = self.ai_app.get(img)
                results = []

                for face in faces:
                    # Allow faces with det_score >= 0.25 (catches side profiles, tilted heads, laughing)
                    if hasattr(face, "det_score") and face.det_score < 0.25:
                        continue

                    # 512-D ArcFace normalized embedding
                    norm = np.linalg.norm(face.embedding)
                    if norm > 0:
                        embedding = (face.embedding / norm).tolist()
                    else:
                        embedding = face.embedding.tolist()

                    box = [int(v) for v in face.bbox]

                    results.append({
                        "box": {"x": box[0], "y": box[1], "w": box[2] - box[0], "h": box[3] - box[1]},
                        "confidence": float(face.det_score) if hasattr(face, "det_score") else 0.95,
                        "embedding": embedding
                    })

                # Sort faces so largest face comes first
                results.sort(key=lambda f: f["box"]["w"] * f["box"]["h"], reverse=True)

                return {"status": "success", "faces": results, "count": len(results)}
            except Exception as e:
                print("[StudioCore AI] Extract error:", e)
                return {"status": "error", "message": str(e), "faces": [], "count": 0}

        return web_app

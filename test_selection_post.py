import urllib.request, json

payload = {
    "gallery_id": "712ab85c-8a36-4fec-8640-607b1a1f1da7",
    "client_name": "Test Client Sahil",
    "client_email": "testclient@gmail.com",
    "selected_photo_ids": ["3081e3c4-21a0-4ee3-97ab-77286421ee03"],
    "is_submitted": True,
    "submitted_at": "2026-11-23T08:15:00.000Z",
    "max_limit": 50
}

req = urllib.request.Request(
    "http://127.0.0.1:3000/api/gallery/selections",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Response status:", resp.status)
        print("Response body:", resp.read().decode())
except Exception as e:
    print("Error:", e)
    if hasattr(e, "read"):
        print("Body:", e.read().decode())

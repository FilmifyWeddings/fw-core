#!/usr/bin/env python3
"""
StudioCore Desktop Turbo Engine for macOS
Lightweight high-speed local loopback server
"""
import http.server
import json
import os
import socket
import ssl
import sys
import urllib.request
import webbrowser

PORT = 41789
VERSION = "2.3.0"

class StudioCoreHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        path = self.path.split('?')[0].lower()
        if path in ['/', '/status', '/ping']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {
                "status": "online",
                "port": PORT,
                "version": VERSION,
                "machine": socket.gethostname(),
                "engine": "StudioCore Native Turbo Engine",
                "active": True
            }
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        path = self.path.split('?')[0].lower()
        if path == '/api/upload-file':
            filename = self.headers.get('x-filename', 'photo.jpg')
            gallery_id = self.headers.get('x-gallery-id', '')
            workspace_id = self.headers.get('x-workspace-id', '')
            collection_id = self.headers.get('x-collection-id', '')

            try:
                content_len = int(self.headers.get('Content-Length', 0))
                file_bytes = self.rfile.read(content_len)

                # Request upload URL
                url_payload = json.dumps({
                    "galleryId": gallery_id,
                    "filename": filename,
                    "filesize": len(file_bytes),
                    "workspaceId": workspace_id,
                    "collectionId": collection_id
                }).encode('utf-8')

                req = urllib.request.Request(
                    "https://studiocore.in/api/gallery/upload-url",
                    data=url_payload,
                    headers={'Content-Type': 'application/json', 'User-Agent': f'StudioCore-Turbo-Engine/{VERSION} (macOS)'}
                )
                with urllib.request.urlopen(req, timeout=60) as resp:
                    url_json = json.loads(resp.read().decode('utf-8'))

                orig_url = url_json.get('originalUploadUrl')
                prev_url = url_json.get('previewUploadUrl')
                thumb_url = url_json.get('thumbUploadUrl')

                # Direct PUT
                put_req = urllib.request.Request(orig_url, data=file_bytes, method='PUT')
                put_req.add_header('Content-Type', 'image/jpeg')
                urllib.request.urlopen(put_req, timeout=120)

                if prev_url:
                    p_req = urllib.request.Request(prev_url, data=file_bytes, method='PUT')
                    p_req.add_header('Content-Type', 'image/jpeg')
                    urllib.request.urlopen(p_req, timeout=120)

                if thumb_url:
                    t_req = urllib.request.Request(thumb_url, data=file_bytes, method='PUT')
                    t_req.add_header('Content-Type', 'image/jpeg')
                    urllib.request.urlopen(t_req, timeout=120)

                # Register in database
                reg_payload = json.dumps({
                    "galleryId": gallery_id,
                    "photos": [{
                        "gallery_id": gallery_id,
                        "collection_id": collection_id if collection_id and collection_id != 'all' else None,
                        "original_key": url_json.get('originalKey'),
                        "preview_key": url_json.get('previewKey'),
                        "thumbnail_key": url_json.get('thumbKey'),
                        "size_bytes": len(file_bytes)
                    }]
                }).encode('utf-8')

                reg_req = urllib.request.Request(
                    "https://studiocore.in/api/gallery/photos/register",
                    data=reg_payload,
                    headers={'Content-Type': 'application/json'}
                )
                urllib.request.urlopen(reg_req, timeout=60)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "filename": filename}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

def run():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), StudioCoreHandler)
    print("================================================================")
    print(f"  ⚡ StudioCore Desktop Turbo Engine v{VERSION} running!")
    print(f"  🌐 Bound locally to http://127.0.0.1:{PORT}")
    print("  📸 Ready for multi-GB high-speed uploads from your browser")
    print("================================================================\n")
    if sys.platform == 'darwin':
        try:
            webbrowser.open('https://studiocore.in/workspace/gallery')
        except:
            pass
    server.serve_forever()

if __name__ == '__main__':
    run()

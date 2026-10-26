#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "================================================================="
echo "   🚀 StudioCore Desktop Turbo Engine (macOS Universal)"
echo "      Next-Generation High-Speed Engine for Wedding Galleries"
echo "================================================================="
echo ""

if command -v node >/dev/null 2>&1; then
    echo "⚡ Starting StudioCore Engine on port 41789 using Node.js..."
    node studiocore-uploader.js
elif command -v python3 >/dev/null 2>&1; then
    echo "⚡ Starting StudioCore Engine on port 41789 using Python 3..."
    python3 studiocore_uploader.py
else
    echo "❌ Neither Node.js nor Python 3 found. macOS usually comes with Python 3."
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

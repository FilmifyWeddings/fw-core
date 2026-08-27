'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Undo, Trash2, Check, Sparkles, Pencil } from 'lucide-react';
import { compressImage } from '@/lib/compressor';

interface PhotoDrawModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveAnnotatedImage: (newUrl: string) => void;
  token: string;
}

const COLORS = [
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Royal Blue', hex: '#3B82F6' },
  { name: 'Emerald Green', hex: '#10B981' },
];

const BRUSH_SIZES = [
  { label: 'Fine', size: 3 },
  { label: 'Normal', size: 6 },
  { label: 'Thick', size: 10 },
  { label: 'Marker', size: 18 },
];

export function PhotoDrawModal({
  imageUrl,
  isOpen,
  onClose,
  onSaveAnnotatedImage,
  token,
}: PhotoDrawModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[1].hex); // Default red
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1].size); // Default normal
  const [history, setHistory] = useState<ImageData[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      // Calculate responsive max dimensions
      const maxWidth = Math.min(window.innerWidth * 0.85, 900);
      const maxHeight = Math.min(window.innerHeight * 0.65, 650);

      let w = img.naturalWidth || 800;
      let h = img.naturalHeight || 600;

      const scale = Math.min(maxWidth / w, maxHeight / h, 1);
      canvas.width = w * scale;
      canvas.height = h * scale;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Save initial clean state in history
      const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialSnapshot]);
    };
  }, [isOpen, imageUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Push new snapshot to history
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, snapshot]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(newHistory);
  };

  const clearAll = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initialCleanState = history[0];
    ctx.putImageData(initialCleanState, 0, 0);
    setHistory([initialCleanState]);
  };

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const saveAnnotatedImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setSaving(true);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Failed to generate image from canvas');
        }

        const file = new File([blob], `annotated-vip-${Date.now()}.webp`, { type: 'image/webp' });
        const compressed = await compressImage(file, 1920, 0.85);

        const formData = new FormData();
        formData.append('file', compressed);
        formData.append('folder', `moodboards/${token}`);

        const res = await fetch('/api/upload/r2', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to upload tagged photo');
        }

        onSaveAnnotatedImage(data.url);
        onClose();
      }, 'image/webp', 0.9);
    } catch (err: any) {
      alert(`Save error: ${err.message || 'Could not save'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full border border-amber-200 shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 bg-[#FFFDF9] border-b border-[#EAE5DD] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tag & Circle VIP Family Members</h3>
              <p className="text-[11px] text-slate-500">Draw circles around faces (e.g. Dad, Mom, Grandparents) so our photographers identify them instantly.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-[#1A1A1A] p-4 flex items-center justify-center overflow-auto">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair rounded-xl shadow-lg touch-none max-w-full max-h-full"
          />
        </div>

        {/* Toolbar & Controls */}
        <div className="p-4 bg-white border-t border-[#EAE5DD] flex flex-wrap items-center justify-between gap-3">
          
          {/* 4 Colors */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Color:</span>
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                    selectedColor === c.hex ? 'scale-125 ring-2 ring-slate-800 ring-offset-2' : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 4 Brush Sizes */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Size:</span>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {BRUSH_SIZES.map((b) => (
                <button
                  key={b.size}
                  onClick={() => setBrushSize(b.size)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    brushSize === b.size
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions: Undo, Clear, Save */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={undo}
              disabled={history.length <= 1}
              className="p-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
              title="Undo last stroke"
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            <button
              onClick={clearAll}
              className="p-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Clear all drawings"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              onClick={saveAnnotatedImage}
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {saving ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Tagged Photo'}</span>
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

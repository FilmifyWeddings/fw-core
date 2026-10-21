'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, RotateCw, ChevronLeft, ChevronRight, PenTool, 
  Trash2, Undo, Check, Sparkles, AlertCircle 
} from 'lucide-react';

interface VideoPlayerProps {
  sourceType: 'upload' | 'youtube';
  videoUrl: string;
  youtubeVideoId?: string | null;
  comments?: Array<{
    id: string;
    timestamp_seconds: number;
    has_annotation?: boolean;
    annotation_data?: any;
    is_resolved?: boolean;
  }>;
  activeCommentId?: string | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  isDrawMode: boolean;
  setIsDrawMode: (val: boolean) => void;
  currentAnnotation: any;
  setCurrentAnnotation: (ann: any) => void;
}

export function formatTimecode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 24); // 24 fps estimate

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  }
  return `${pad(m)}:${pad(s)}:${pad(f)}`;
}

export default function VideoPlayer({
  sourceType,
  videoUrl,
  youtubeVideoId,
  comments = [],
  activeCommentId,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  isDrawMode,
  setIsDrawMode,
  currentAnnotation,
  setCurrentAnnotation,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytIntervalRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverX, setHoverX] = useState(0);

  // Drawing state
  const [drawColor, setDrawColor] = useState('#F59E0B'); // Default gold/amber
  const [drawTool, setDrawTool] = useState<'pen' | 'arrow' | 'rect'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<any[]>([]);

  // 1. YouTube Player Integration
  useEffect(() => {
    if (sourceType !== 'youtube' || !youtubeVideoId) return;

    // Load YouTube IFrame API script if not present
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const initYT = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch (_) {}
        }
        ytPlayerRef.current = new (window as any).YT.Player(`yt-review-player-${youtubeVideoId}`, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 1,
          },
          events: {
            onReady: (event: any) => {
              const dur = event.target.getDuration();
              setDuration(dur);
              if (onDurationChange) onDurationChange(dur);
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsDrawMode(false);
                clearInterval(ytIntervalRef.current);
                ytIntervalRef.current = setInterval(() => {
                  if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
                    const t = ytPlayerRef.current.getCurrentTime();
                    onTimeUpdate(t);
                  }
                }, 100);
              } else {
                setIsPlaying(false);
                clearInterval(ytIntervalRef.current);
              }
            },
          },
        });
      } else {
        setTimeout(initYT, 300);
      }
    };

    initYT();

    return () => {
      clearInterval(ytIntervalRef.current);
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (_) {}
      }
    };
  }, [sourceType, youtubeVideoId]);

  // 2. Seek video when currentTime is driven from outside (e.g. clicking a comment)
  const seekTo = useCallback((seconds: number) => {
    if (sourceType === 'youtube') {
      if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
        ytPlayerRef.current.seekTo(seconds, true);
        onTimeUpdate(seconds);
      }
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        onTimeUpdate(seconds);
      }
    }
  }, [sourceType, onTimeUpdate]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (sourceType === 'youtube') {
      if (!ytPlayerRef.current) return;
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    } else {
      if (!videoRef.current) return;
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [sourceType, isPlaying]);

  // Frame Stepping (1 frame at 24fps = ~0.0416 seconds)
  const stepFrame = (frames: number) => {
    const delta = frames * (1 / 24);
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    seekTo(newTime);
  };

  // Keyboard Shortcuts (Space, J/K/L, Left/Right, C, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(e.shiftKey ? -24 : -1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrame(e.shiftKey ? 24 : 1);
      } else if (e.key === 'j' || e.key === 'J') {
        seekTo(Math.max(0, currentTime - 5));
      } else if (e.key === 'l' || e.key === 'L') {
        seekTo(Math.min(duration, currentTime + 5));
      } else if (e.key === 'k' || e.key === 'K') {
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted(prev => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, currentTime, duration, seekTo]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 3. Canvas Drawing Layer Logic
  const redrawCanvas = useCallback((pointsToDraw: any[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If an active comment has stored annotation data, draw it
    const activeComment = comments.find(c => c.id === activeCommentId);
    const annotationData = currentAnnotation || (activeComment?.has_annotation ? activeComment.annotation_data : null);

    const points = pointsToDraw.length > 0 ? pointsToDraw : (annotationData?.points || []);
    if (!points || points.length === 0) return;

    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = annotationData?.color || drawColor;

    if (annotationData?.tool === 'arrow' && points.length >= 2) {
      const p1 = points[0];
      const p2 = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Draw arrow head
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - 15 * Math.cos(angle - Math.PI / 6), p2.y - 15 * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - 15 * Math.cos(angle + Math.PI / 6), p2.y - 15 * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (annotationData?.tool === 'rect' && points.length >= 2) {
      const p1 = points[0];
      const p2 = points[points.length - 1];
      ctx.beginPath();
      ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    } else {
      // Freehand pen
      ctx.beginPath();
      points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  }, [activeCommentId, comments, currentAnnotation, drawColor]);

  // Adjust canvas size to match container
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
      redrawCanvas(drawingPoints);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas, drawingPoints]);

  useEffect(() => {
    redrawCanvas(drawingPoints);
  }, [activeCommentId, currentAnnotation, redrawCanvas, drawingPoints]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawMode) return;
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const initial = [pt];
    setDrawingPoints(initial);
    redrawCanvas(initial);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDrawingPoints(prev => {
      const updated = [...prev, pt];
      redrawCanvas(updated);
      return updated;
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !isDrawMode) return;
    setIsDrawing(false);
    if (drawingPoints.length > 1) {
      setCurrentAnnotation({
        tool: drawTool,
        color: drawColor,
        points: drawingPoints,
      });
    }
  };

  const clearAnnotation = () => {
    setDrawingPoints([]);
    setCurrentAnnotation(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl select-none group border border-white/10"
    >
      {/* 1. HTML5 Video Player */}
      {sourceType === 'upload' && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          onTimeUpdate={() => {
            if (videoRef.current) {
              onTimeUpdate(videoRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const dur = videoRef.current.duration;
              setDuration(dur);
              if (onDurationChange) onDurationChange(dur);
            }
          }}
          onPlay={() => {
            setIsPlaying(true);
            setIsDrawMode(false);
          }}
          onPause={() => setIsPlaying(false)}
          playsInline
        />
      )}

      {/* 2. YouTube IFrame Player Container */}
      {sourceType === 'youtube' && (
        <div className="w-full h-full flex items-center justify-center">
          <div id={`yt-review-player-${youtubeVideoId}`} className="w-full h-full pointer-events-none" />
          {/* Overlay to intercept clicks for custom control bar */}
          <div 
            onClick={togglePlay} 
            className="absolute inset-0 cursor-pointer bg-transparent" 
          />
        </div>
      )}

      {/* 3. Interactive Frame Drawing Canvas Overlay */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`absolute inset-0 z-20 ${isDrawMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
      />

      {/* 4. Active Drawing Toolbar (When draw mode is ON) */}
      {isDrawMode && (
        <div className="absolute top-4 left-4 z-30 bg-zinc-900/90 backdrop-blur-md border border-white/15 px-3 py-2 rounded-2xl flex items-center gap-2.5 shadow-xl animate-in fade-in duration-200">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <PenTool className="w-3.5 h-3.5" /> Draw on Frame
          </span>

          <div className="flex items-center gap-1 border-x border-white/10 px-2">
            {(['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#FFFFFF'] as const).map(color => (
              <button
                key={color}
                onClick={() => setDrawColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                  drawColor === color ? 'ring-2 ring-white scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setDrawTool('pen')}
              className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                drawTool === 'pen' ? 'bg-amber-500 text-white' : 'text-zinc-300 hover:text-white'
              }`}
            >
              Pen
            </button>
            <button
              onClick={() => setDrawTool('arrow')}
              className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                drawTool === 'arrow' ? 'bg-amber-500 text-white' : 'text-zinc-300 hover:text-white'
              }`}
            >
              Arrow
            </button>
            <button
              onClick={() => setDrawTool('rect')}
              className={`px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition ${
                drawTool === 'rect' ? 'bg-amber-500 text-white' : 'text-zinc-300 hover:text-white'
              }`}
            >
              Box
            </button>
          </div>

          <button
            onClick={clearAnnotation}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 cursor-pointer ml-1 transition"
            title="Clear Drawing"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Sleek Floating Bottom Control Bar */}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        
        {/* Timeline Scrubber Bar with Comment Marker Dots */}
        <div 
          className="relative w-full h-2.5 bg-white/20 rounded-full cursor-pointer group/timeline mb-3.5 select-none"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            seekTo(clickPos * duration);
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            setHoverTime(pos * duration);
            setHoverX(e.clientX - rect.left);
            setIsHoveringTimeline(true);
          }}
          onMouseLeave={() => setIsHoveringTimeline(false)}
        >
          {/* Progress fill */}
          <div 
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
          />

          {/* Hover Scrub Preview Badge */}
          {isHoveringTimeline && (
            <div 
              style={{ left: `${hoverX}px` }}
              className="absolute -top-7 -translate-x-1/2 bg-black/85 text-amber-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 pointer-events-none shadow-md"
            >
              {formatTimecode(hoverTime)}
            </div>
          )}

          {/* Comment Marker Dots on Timeline */}
          {comments.map((c) => {
            const posPercent = duration > 0 ? (c.timestamp_seconds / duration) * 100 : 0;
            const isResolved = c.is_resolved;
            return (
              <div
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(c.timestamp_seconds);
                }}
                style={{ left: `${posPercent}%` }}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full cursor-pointer z-10 transition-transform hover:scale-150 ${
                  isResolved 
                    ? 'bg-emerald-400 ring-2 ring-emerald-500/50' 
                    : 'bg-amber-400 ring-2 ring-amber-500/50'
                }`}
                title={`Feedback at ${formatTimecode(c.timestamp_seconds)}`}
              />
            );
          })}
        </div>

        {/* Playback Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          
          {/* Left Controls: Play/Pause, Step Frames, Timecode */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer transition shadow-md"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Frame Step Back */}
            <button
              onClick={() => stepFrame(-1)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition"
              title="Step Backward 1 Frame (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Frame Step Forward */}
            <button
              onClick={() => stepFrame(1)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition"
              title="Step Forward 1 Frame (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Frame Timecode Display */}
            <div className="font-mono text-xs font-bold tracking-tight text-white/90 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
              <span className="text-amber-400">{formatTimecode(currentTime)}</span>
              <span className="text-white/40 mx-1.5">/</span>
              <span>{formatTimecode(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Draw on frame, Speed, Volume, Fullscreen */}
          <div className="flex items-center gap-2.5">
            
            {/* Draw on Frame Button */}
            <button
              onClick={() => {
                if (isPlaying) togglePlay();
                setIsDrawMode(!isDrawMode);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                isDrawMode 
                  ? 'bg-amber-500 text-white shadow-md' 
                  : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
              }`}
              title="Draw annotation on current video frame"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>{isDrawMode ? 'Drawing Active' : 'Annotate'}</span>
            </button>

            {/* Playback Speed selector */}
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value);
                setPlaybackRate(rate);
                if (sourceType === 'upload' && videoRef.current) {
                  videoRef.current.playbackRate = rate;
                } else if (sourceType === 'youtube' && ytPlayerRef.current?.setPlaybackRate) {
                  ytPlayerRef.current.setPlaybackRate(rate);
                }
              }}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg px-2 py-1 text-xs font-bold cursor-pointer outline-hidden"
            >
              <option value="0.5" className="bg-zinc-900">0.5x</option>
              <option value="0.75" className="bg-zinc-900">0.75x</option>
              <option value="1" className="bg-zinc-900">1x</option>
              <option value="1.25" className="bg-zinc-900">1.25x</option>
              <option value="1.5" className="bg-zinc-900">1.5x</option>
              <option value="2" className="bg-zinc-900">2x</option>
            </select>

            {/* Volume / Mute */}
            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (sourceType === 'upload' && videoRef.current) {
                  videoRef.current.muted = nextMuted;
                } else if (sourceType === 'youtube' && ytPlayerRef.current) {
                  if (nextMuted) ytPlayerRef.current.mute();
                  else ytPlayerRef.current.unMute();
                }
              }}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

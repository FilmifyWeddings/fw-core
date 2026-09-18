'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { soundCtrl } from './SoundController';
import { useCurrency } from './CurrencyContext';
import { 
  Rotate3d, Sparkles, Eye, ZoomIn, ZoomOut, Check, 
  Layers, Info, ShieldCheck, ChevronRight, X, Heart
} from 'lucide-react';

export interface ProductColorway {
  name: string;
  hex: string;
  threeColor: number;
  zariColor: number;
}

export interface HotspotPin {
  id: string;
  title: string;
  desc: string;
  pos3D: [number, number, number];
  tag: string;
}

export interface ProductData {
  id: string;
  name: string;
  nameHindi: string;
  tagline: string;
  category: string;
  basePriceInr: number;
  silhouetteType: 'lehenga' | 'saree' | 'anarkali' | 'fusion';
  editorialImage: string;
  editorialVideoGif: string;
  swatches: ProductColorway[];
  hotspots: HotspotPin[];
  craftSpecs: { label: string; value: string }[];
  story: string;
}

interface DressViewer3DProps {
  product: ProductData;
  onInquire: (product: ProductData) => void;
}

export const DressViewer3D: React.FC<DressViewer3DProps> = ({ product, onInquire }) => {
  const [viewMode, setViewMode] = useState<'3D' | 'REAL'>('3D');
  const [activeSwatch, setActiveSwatch] = useState<ProductColorway>(product.swatches[0]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPin | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const { formatPrice } = useCurrency();

  // Reset swatch when product changes
  useEffect(() => {
    setActiveSwatch(product.swatches[0]);
    setSelectedHotspot(null);
  }, [product]);

  // 3D Canvas References
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dressGroupRef = useRef<THREE.Group | null>(null);
  const dressMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const zariMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Hotspots 2D screen positions state
  const [screenHotspots, setScreenHotspots] = useState<{ id: string; x: number; y: number; visible: boolean }[]>([]);

  // Drag rotation state
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0 });

  // Initialize and update Three.js scene
  useEffect(() => {
    if (viewMode !== '3D') return;

    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFBF8F3);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.3, 3.8);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambient = new THREE.AmbientLight(0xFAF5EC, 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xFFF7EA, 2.2);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const goldBacklight = new THREE.DirectionalLight(0xD4AF37, 1.6);
    goldBacklight.position.set(-3, 3, -3);
    scene.add(goldBacklight);

    const rimLight = new THREE.PointLight(0xFDF8EE, 1.2, 10);
    rimLight.position.set(0, -0.5, 2.5);
    scene.add(rimLight);

    // 5. Plinth
    const plinthGroup = new THREE.Group();
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0xF3EEE6,
      roughness: 0.3,
      metalness: 0.08,
    });
    const plinthGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.12, 48);
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -1.1;
    plinth.receiveShadow = true;
    plinthGroup.add(plinth);

    // Gold plinth rim
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.2,
      metalness: 0.9,
    });
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(1.41, 0.02, 16, 64), rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = -1.04;
    plinthGroup.add(rimMesh);

    scene.add(plinthGroup);

    // 6. 3D Couture Garment Geometry Group
    const dressGroup = new THREE.Group();
    dressGroup.position.y = -1.0;
    dressGroupRef.current = dressGroup;

    // Materials
    const dressMat = new THREE.MeshStandardMaterial({
      color: activeSwatch.threeColor,
      roughness: 0.36,
      metalness: 0.32,
      side: THREE.DoubleSide,
    });
    dressMatRef.current = dressMat;

    const zariMat = new THREE.MeshStandardMaterial({
      color: activeSwatch.zariColor,
      roughness: 0.22,
      metalness: 0.9,
    });
    zariMatRef.current = zariMat;

    // Construct garment depending on silhouetteType
    if (product.silhouetteType === 'lehenga') {
      // Flared 36-Kali Lehenga
      const skirtGeo = new THREE.CylinderGeometry(0.28, 1.15, 1.25, 48, 20, true);
      const skirtMesh = new THREE.Mesh(skirtGeo, dressMat);
      skirtMesh.position.y = 0.62;
      skirtMesh.castShadow = true;
      dressGroup.add(skirtMesh);

      // Zari hem border
      const hemGeo = new THREE.TorusGeometry(1.15, 0.04, 16, 64);
      const hemMesh = new THREE.Mesh(hemGeo, zariMat);
      hemMesh.rotation.x = Math.PI / 2;
      hemMesh.position.y = 0.02;
      dressGroup.add(hemMesh);

      // Bodice / Blouse
      const bodiceGeo = new THREE.CylinderGeometry(0.24, 0.27, 0.55, 32);
      const bodice = new THREE.Mesh(bodiceGeo, dressMat);
      bodice.position.y = 1.52;
      bodice.castShadow = true;
      dressGroup.add(bodice);

      // Sweetheart gold trim
      const trimGeo = new THREE.TorusGeometry(0.24, 0.02, 12, 32);
      const trim = new THREE.Mesh(trimGeo, zariMat);
      trim.rotation.x = Math.PI / 2;
      trim.position.y = 1.78;
      dressGroup.add(trim);

      // Dupatta drape
      const dupCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.35, 1.8, 0.05),
        new THREE.Vector3(-0.1, 1.45, 0.3),
        new THREE.Vector3(0.3, 1.1, 0.22),
        new THREE.Vector3(0.55, 0.6, 0.35),
        new THREE.Vector3(0.65, 0.1, 0.25),
      ]);
      const dupGeo = new THREE.TubeGeometry(dupCurve, 32, 0.11, 12, false);
      const dupMat = new THREE.MeshStandardMaterial({
        color: activeSwatch.zariColor,
        roughness: 0.25,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const dupMesh = new THREE.Mesh(dupGeo, dupMat);
      dressGroup.add(dupMesh);
    } else if (product.silhouetteType === 'saree') {
      // Royal Draped Saree
      const sareeGeo = new THREE.CylinderGeometry(0.26, 0.65, 1.35, 36, 16, true);
      const sareeMesh = new THREE.Mesh(sareeGeo, dressMat);
      sareeMesh.position.y = 0.68;
      sareeMesh.castShadow = true;
      dressGroup.add(sareeMesh);

      // Cascading Pallu
      const palluCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.25, 0.8, 0.25),
        new THREE.Vector3(-0.25, 1.45, 0.2),
        new THREE.Vector3(-0.35, 1.85, 0.05),
        new THREE.Vector3(-0.55, 1.2, -0.15),
        new THREE.Vector3(-0.65, 0.3, -0.2),
      ]);
      const palluGeo = new THREE.TubeGeometry(palluCurve, 40, 0.14, 12, false);
      const palluMesh = new THREE.Mesh(palluGeo, zariMat);
      dressGroup.add(palluMesh);

      const blouseGeo = new THREE.CylinderGeometry(0.23, 0.25, 0.5, 32);
      const blouse = new THREE.Mesh(blouseGeo, dressMat);
      blouse.position.y = 1.55;
      dressGroup.add(blouse);
    } else if (product.silhouetteType === 'anarkali') {
      // Floor length Anarkali Gown
      const skirtGeo = new THREE.ConeGeometry(1.2, 1.5, 48, 16, true);
      const skirtMesh = new THREE.Mesh(skirtGeo, dressMat);
      skirtMesh.position.y = 0.75;
      skirtMesh.castShadow = true;
      dressGroup.add(skirtMesh);

      const bodiceGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.65, 32);
      const bodice = new THREE.Mesh(bodiceGeo, dressMat);
      bodice.position.y = 1.6;
      dressGroup.add(bodice);

      // Gold tiered ghera borders
      [0.05, 0.3, 0.6].forEach((yPos, idx) => {
        const rad = 1.2 - yPos * 0.7;
        const bMesh = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.02, 12, 48), zariMat);
        bMesh.rotation.x = Math.PI / 2;
        bMesh.position.y = yPos;
        dressGroup.add(bMesh);
      });
    } else {
      // Indo-Western Fusion Cape Set
      const pantsGeo = new THREE.CylinderGeometry(0.26, 0.55, 1.3, 32, 16, true);
      const pants = new THREE.Mesh(pantsGeo, dressMat);
      pants.position.y = 0.65;
      dressGroup.add(pants);

      const corsetGeo = new THREE.CylinderGeometry(0.23, 0.26, 0.5, 32);
      const corset = new THREE.Mesh(corsetGeo, zariMat);
      corset.position.y = 1.55;
      dressGroup.add(corset);

      // Sheer Organza Cape
      const capeGeo = new THREE.CylinderGeometry(0.35, 0.95, 1.45, 32, 16, true, Math.PI * 0.4, Math.PI * 1.2);
      const capeMat = new THREE.MeshStandardMaterial({
        color: activeSwatch.threeColor,
        roughness: 0.18,
        metalness: 0.4,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      const cape = new THREE.Mesh(capeGeo, capeMat);
      cape.position.y = 1.1;
      dressGroup.add(cape);
    }

    scene.add(dressGroup);

    // 7. Mouse/Touch Drag Controls
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !dressGroupRef.current) return;
      const deltaX = e.clientX - prevMouseRef.current.x;
      const deltaY = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      rotationVelocityRef.current.y = deltaX * 0.008;
      rotationVelocityRef.current.x = deltaY * 0.004;

      dressGroupRef.current.rotation.y += rotationVelocityRef.current.y;
      soundCtrl.playFabricSwoosh();
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 8. Animation & Projection of Hotspots
    let animId: number;
    const projVector = new THREE.Vector3();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      // Inertia decay
      if (!isDraggingRef.current && dressGroupRef.current) {
        dressGroupRef.current.rotation.y += 0.004; // gentle royal turntable spin
      }

      // Calculate 2D Screen Positions for Hotspots
      if (camera && dressGroupRef.current && container) {
        const computed = product.hotspots.map((hs) => {
          projVector.set(...hs.pos3D);
          projVector.applyMatrix4(dressGroupRef.current!.matrixWorld);
          projVector.project(camera);

          const isFacingCamera = projVector.z < 1;
          const x = (projVector.x * 0.5 + 0.5) * container.clientWidth;
          const y = (-(projVector.y * 0.5) + 0.5) * container.clientHeight;

          return {
            id: hs.id,
            x,
            y,
            visible: isFacingCamera && x > 20 && x < container.clientWidth - 20 && y > 20 && y < container.clientHeight - 20,
          };
        });
        setScreenHotspots(computed);
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    // Resize handling
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [viewMode, product]);

  // Update Swatch Colors in 3D scene in real-time
  useEffect(() => {
    if (dressMatRef.current) {
      dressMatRef.current.color.setHex(activeSwatch.threeColor);
    }
    if (zariMatRef.current) {
      zariMatRef.current.color.setHex(activeSwatch.zariColor);
    }
  }, [activeSwatch]);

  // Zoom control
  const handleZoom = (factor: number) => {
    if (!cameraRef.current) return;
    const newZoom = Math.min(Math.max(zoomLevel * factor, 0.75), 1.6);
    setZoomLevel(newZoom);
    cameraRef.current.position.z = 3.8 / newZoom;
    soundCtrl.playClick();
  };

  // Real Model Magnifier Loupe Tracker
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLoupePos({ x, y, show: true });
  };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-[#FAF6F0] border border-[#EADCC9]/80 shadow-[0_20px_50px_-15px_rgba(42,39,35,0.06)] overflow-hidden">
      
      {/* Top Header: Dual Mode Switcher & Controls */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 border-b border-[#EADCC9]/60 bg-[#FBF8F3]/70 backdrop-blur-xs">
        
        {/* Product Identity */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.24em] font-serif text-[#D4AF37]">
              {product.nameHindi}
            </span>
            <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-sans text-[#2A2723]/60">
              {product.category}
            </span>
          </div>
          <h3
            className="text-xl sm:text-2xl font-serif text-[#2A2723] tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {product.name}
          </h3>
        </div>

        {/* Dual Visual Switching Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#EFE8DC] border border-[#D4AF37]/30">
          <button
            onClick={() => {
              setViewMode('3D');
              soundCtrl.playClick();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-sans font-medium tracking-wider uppercase transition-all duration-300 ${
              viewMode === '3D'
                ? 'bg-[#2A2723] text-[#FAF8F3] shadow-xs'
                : 'text-[#2A2723]/70 hover:text-[#2A2723]'
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Interactive 3D</span>
          </button>
          
          <button
            onClick={() => {
              setViewMode('REAL');
              soundCtrl.playClick();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-sans font-medium tracking-wider uppercase transition-all duration-300 ${
              viewMode === 'REAL'
                ? 'bg-[#2A2723] text-[#FAF8F3] shadow-xs'
                : 'text-[#2A2723]/70 hover:text-[#2A2723]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Real Runway Model</span>
          </button>
        </div>
      </div>

      {/* Main Canvas / Image Showcase Viewport */}
      <div className="relative w-full h-[450px] sm:h-[540px] md:h-[600px] overflow-hidden select-none bg-[#FBF8F3]">
        
        {viewMode === '3D' ? (
          <>
            {/* 3D WebGL Canvas */}
            <div
              ref={canvasContainerRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              title="Click and drag to rotate in 360°"
            />

            {/* Interactive 3D Hotspot Pins (Projected from 3D coords to Screen) */}
            {screenHotspots.map((hs) => {
              const spotData = product.hotspots.find((p) => p.id === hs.id);
              if (!spotData || !hs.visible) return null;

              return (
                <div
                  key={hs.id}
                  style={{ left: `${hs.x}px`, top: `${hs.y}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto"
                >
                  <button
                    onClick={() => {
                      soundCtrl.playChime(660);
                      setSelectedHotspot(spotData);
                    }}
                    className="group relative flex items-center justify-center w-7 h-7 rounded-full bg-[#FAF5EC] border-2 border-[#D4AF37] shadow-lg hover:scale-125 transition-transform duration-300"
                    aria-label={`Hotspot: ${spotData.title}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] group-hover:scale-150 transition-transform" />
                    <span className="absolute -inset-1.5 rounded-full border border-[#D4AF37]/50 animate-ping" />
                  </button>

                  {/* Hotspot Floating Label */}
                  <span className="hidden sm:block absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-md bg-[#2A2723]/90 text-[#FAF8F3] text-[10px] tracking-wider uppercase font-sans pointer-events-none shadow-md">
                    {spotData.title}
                  </span>
                </div>
              );
            })}

            {/* Bottom 3D Controls Bar */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF5EC]/85 border border-[#EADCC9] text-[11px] font-sans tracking-widest text-[#2A2723]/75 uppercase">
                <Rotate3d className="w-3.5 h-3.5 text-[#D4AF37] animate-spin-slow" />
                <span className="hidden sm:inline">Drag to Orbit 360°</span>
              </div>

              {/* Zoom In/Out Buttons */}
              <div className="flex items-center gap-1 pointer-events-auto bg-[#FAF5EC]/85 p-1 rounded-full border border-[#EADCC9]">
                <button
                  onClick={() => handleZoom(1.15)}
                  className="p-1.5 rounded-full hover:bg-[#EFE8DC] text-[#2A2723] transition-colors"
                  title="Zoom In"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4 text-[#D4AF37]" />
                </button>
                <button
                  onClick={() => handleZoom(0.87)}
                  className="p-1.5 rounded-full hover:bg-[#EFE8DC] text-[#2A2723] transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4 text-[#D4AF37]" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Real Photographed Editorial Runway Model View with Macro Loupe */
          <div
            className="relative w-full h-full cursor-crosshair overflow-hidden group"
            onMouseMove={handleImageMouseMove}
            onMouseLeave={() => setLoupePos((prev) => ({ ...prev, show: false }))}
          >
            {/* High-Resolution Model Image */}
            <img
              src={product.editorialImage}
              alt={product.name}
              className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />

            {/* Loupe Zoom Overlay Window */}
            {loupePos.show && (
              <div
                style={{
                  left: `${loupePos.x}%`,
                  top: `${loupePos.y}%`,
                  backgroundImage: `url(${product.editorialImage})`,
                  backgroundPosition: `${loupePos.x}% ${loupePos.y}%`,
                  backgroundSize: '280%',
                }}
                className="hidden sm:block absolute w-44 h-44 rounded-full border-2 border-[#D4AF37] shadow-2xl pointer-events-none -translate-x-1/2 -translate-y-1/2 z-30"
              >
                <div className="absolute inset-0 rounded-full border border-white/40" />
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#2A2723]/90 text-[9px] uppercase tracking-wider text-[#FAF8F3] font-sans">
                  Macro Weave
                </span>
              </div>
            )}

            {/* Editorial Runway Badge */}
            <div className="absolute bottom-4 left-4 z-20 px-3.5 py-1.5 rounded-full bg-[#2A2723]/80 backdrop-blur-xs text-[#FAF8F3] text-[11px] font-sans tracking-widest uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
              <span>Real Runway Photography • Atelier Archive</span>
            </div>
          </div>
        )}

        {/* Selected Hotspot Artisan Detail Card Overlay */}
        {selectedHotspot && (
          <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="relative max-w-sm w-full bg-[#FBF8F3] border border-[#D4AF37] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setSelectedHotspot(null)}
                className="absolute top-4 right-4 p-1 rounded-full text-[#2A2723]/60 hover:text-[#2A2723]"
              >
                <X className="w-4 h-4" />
              </button>

              <span className="text-[10px] font-sans tracking-[0.24em] uppercase text-[#D4AF37] font-semibold">
                {selectedHotspot.tag}
              </span>
              <h4 className="text-xl font-serif text-[#2A2723] mt-1 mb-2">
                {selectedHotspot.title}
              </h4>
              <p className="text-xs text-[#2A2723]/80 leading-relaxed font-sans mb-4">
                {selectedHotspot.desc}
              </p>

              <div className="pt-3 border-t border-[#EADCC9] flex items-center justify-between text-[11px] font-sans text-[#2A2723]/70">
                <span>Purity Guaranteed</span>
                <span className="font-semibold text-[#D4AF37]">Authentic Royal Craft</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Configuration Tray: Colorways, Specs & Couture Inquiry */}
      <div className="p-4 sm:p-6 bg-[#FBF8F3] border-t border-[#EADCC9]/60 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Interactive Colorway Swatches */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto">
          <span className="text-xs font-sans tracking-widest uppercase text-[#2A2723]/70">
            Royal Palettes:
          </span>
          <div className="flex items-center gap-2.5">
            {product.swatches.map((swatch) => (
              <button
                key={swatch.name}
                onClick={() => {
                  setActiveSwatch(swatch);
                  soundCtrl.playClick();
                  soundCtrl.playFabricSwoosh();
                }}
                className={`group relative flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
                  activeSwatch.name === swatch.name
                    ? 'border-[#D4AF37] scale-110 shadow-sm ring-2 ring-[#D4AF37]/30'
                    : 'border-[#EADCC9] hover:border-[#D4AF37]/60'
                }`}
                style={{ backgroundColor: swatch.hex }}
                title={swatch.name}
              >
                {activeSwatch.name === swatch.name && (
                  <Check className="w-3.5 h-3.5 text-[#FAF8F3] drop-shadow-md" />
                )}
              </button>
            ))}
            <span className="ml-2 text-xs font-serif italic text-[#2A2723]/80">
              {activeSwatch.name}
            </span>
          </div>
        </div>

        {/* Pricing & Inquiry Action */}
        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-[#EADCC9]">
          <div className="text-left md:text-right">
            <span className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/60 block">
              Bespoke Price
            </span>
            <span className="text-xl sm:text-2xl font-serif font-bold text-[#2A2723]">
              {formatPrice(product.basePriceInr)}
            </span>
          </div>

          <button
            onClick={() => {
              soundCtrl.playChime(792);
              onInquire(product);
            }}
            className="group relative px-6 py-3 rounded-full bg-[#2A2723] text-[#FAF8F3] text-xs font-medium tracking-[0.18em] uppercase border border-[#D4AF37] hover:bg-[#FAF6F0] hover:text-[#2A2723] transition-all duration-300 shadow-md flex items-center gap-2"
          >
            <span>Inquire Couture</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#D4AF37] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

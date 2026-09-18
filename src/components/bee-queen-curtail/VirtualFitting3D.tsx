'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { soundCtrl } from './SoundController';

export interface FittingConfig {
  silhouette: 'classic_lehenga' | 'mermaid_flare' | 'royal_saree' | 'indo_western';
  blouseCut: 'sweetheart' | 'plunge_v' | 'mandarin' | 'backless_dori';
  fabric: 'katan_silk' | 'crushed_velvet' | 'italian_organza' | 'chiffon';
  colorHex: string;
  zariOpulence: 'subtle' | 'heritage' | 'imperial';
  measurements: {
    bust: number;
    waist: number;
    hip: number;
    height: number;
    unit: 'cm' | 'in';
  };
}

interface VirtualFitting3DProps {
  config: FittingConfig;
}

export const VirtualFitting3D: React.FC<VirtualFitting3DProps> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const skirtMeshRef = useRef<THREE.Mesh | null>(null);
  const blouseMeshRef = useRef<THREE.Mesh | null>(null);
  const drapeMeshRef = useRef<THREE.Mesh | null>(null);

  // Drag interaction
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFBF8F3);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 1.3, 3.6);
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

    // 4. Lighting (Warm Atelier Studio Lighting)
    const ambient = new THREE.AmbientLight(0xFAF4EB, 1.4);
    scene.add(ambient);

    const mainKey = new THREE.DirectionalLight(0xFFF7EA, 2.2);
    mainKey.position.set(3, 5, 3.5);
    mainKey.castShadow = true;
    mainKey.shadow.bias = -0.0001;
    scene.add(mainKey);

    const rimGold = new THREE.DirectionalLight(0xD4AF37, 1.5);
    rimGold.position.set(-3, 3, -3);
    scene.add(rimGold);

    const bottomFill = new THREE.PointLight(0xFDF8EE, 1.1, 8);
    bottomFill.position.set(0, -0.4, 2);
    scene.add(bottomFill);

    // 5. Studio Atelier Circular Plinth
    const plinthGroup = new THREE.Group();
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0xEFE8DC,
      roughness: 0.28,
      metalness: 0.1,
    });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.1, 48), plinthMat);
    plinth.position.y = -1.15;
    plinth.receiveShadow = true;
    plinthGroup.add(plinth);

    const goldRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.31, 0.018, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.2, metalness: 0.9 })
    );
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = -1.1;
    plinthGroup.add(goldRing);
    scene.add(plinthGroup);

    // 6. Model Base Root Group
    const modelGroup = new THREE.Group();
    modelGroup.position.y = -1.05;
    modelGroupRef.current = modelGroup;
    scene.add(modelGroup);

    // 7. Event Handlers for Drag
    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !modelGroupRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      modelGroupRef.current.rotation.y += dx * 0.008;
      soundCtrl.playFabricSwoosh();
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 8. Render Loop
    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      if (!isDraggingRef.current && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    render();

    // Resize
    const onResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  // Update Geometry and Materials Whenever Config Changes
  useEffect(() => {
    const modelGroup = modelGroupRef.current;
    if (!modelGroup) return;

    // Clear previous children
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      modelGroup.remove(child);
    }

    // Material setup based on fabric selection
    let roughness = 0.35;
    let metalness = 0.3;
    let opacity = 1.0;
    let transparent = false;

    if (config.fabric === 'katan_silk') {
      roughness = 0.28;
      metalness = 0.45;
    } else if (config.fabric === 'crushed_velvet') {
      roughness = 0.55;
      metalness = 0.2;
    } else if (config.fabric === 'italian_organza') {
      roughness = 0.2;
      metalness = 0.3;
      opacity = 0.75;
      transparent = true;
    } else {
      // Chiffon
      roughness = 0.38;
      metalness = 0.15;
      opacity = 0.85;
      transparent = true;
    }

    const dressMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.colorHex),
      roughness,
      metalness,
      opacity,
      transparent,
      side: THREE.DoubleSide,
    });

    const zariMat = new THREE.MeshStandardMaterial({
      color: config.zariOpulence === 'subtle' ? 0xC2A25A : config.zariOpulence === 'heritage' ? 0xD4AF37 : 0xF5D468,
      roughness: 0.2,
      metalness: config.zariOpulence === 'imperial' ? 0.95 : 0.8,
    });

    // Body mannequin proportions calculated from measurements
    const waistCm = config.measurements.unit === 'in' ? config.measurements.waist * 2.54 : config.measurements.waist;
    const hipCm = config.measurements.unit === 'in' ? config.measurements.hip * 2.54 : config.measurements.hip;
    const bustCm = config.measurements.unit === 'in' ? config.measurements.bust * 2.54 : config.measurements.bust;

    const waistRadius = (waistCm / 70) * 0.26;
    const hipRadius = (hipCm / 95) * 0.34;
    const bustRadius = (bustCm / 88) * 0.27;

    // 1. Mannequin Torso / Bodice based on blouseCut
    let blouseHeight = 0.55;
    let blouseTopRad = bustRadius;
    let blouseBotRad = waistRadius;

    if (config.blouseCut === 'mandarin') {
      blouseHeight = 0.65;
    }

    const bodiceGeo = new THREE.CylinderGeometry(blouseTopRad, blouseBotRad, blouseHeight, 32);
    const bodice = new THREE.Mesh(bodiceGeo, dressMat);
    bodice.position.y = 1.55;
    bodice.castShadow = true;
    modelGroup.add(bodice);

    // Neckline gold zari trim
    const neckTrim = new THREE.Mesh(new THREE.TorusGeometry(blouseTopRad, 0.018, 12, 32), zariMat);
    neckTrim.rotation.x = Math.PI / 2;
    neckTrim.position.y = 1.55 + blouseHeight / 2;
    modelGroup.add(neckTrim);

    // 2. Skirt / Silhouette Geometry
    if (config.silhouette === 'classic_lehenga') {
      const skirtGeo = new THREE.CylinderGeometry(waistRadius, 1.25, 1.25, 48, 16, true);
      const skirt = new THREE.Mesh(skirtGeo, dressMat);
      skirt.position.y = 0.62;
      skirt.castShadow = true;
      modelGroup.add(skirt);

      // Gold hem border
      const hem = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.04, 16, 64), zariMat);
      hem.rotation.x = Math.PI / 2;
      hem.position.y = 0.02;
      modelGroup.add(hem);
    } else if (config.silhouette === 'mermaid_flare') {
      // Mermaid: hugs hips then flares dramatically at knees
      const mermaidGeo = new THREE.CylinderGeometry(waistRadius, hipRadius, 0.5, 32, 8, true);
      const mermaidTop = new THREE.Mesh(mermaidGeo, dressMat);
      mermaidTop.position.y = 1.0;
      modelGroup.add(mermaidTop);

      const flareGeo = new THREE.CylinderGeometry(hipRadius * 0.85, 1.15, 0.75, 36, 12, true);
      const flare = new THREE.Mesh(flareGeo, dressMat);
      flare.position.y = 0.38;
      flare.castShadow = true;
      modelGroup.add(flare);

      const hem = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 16, 64), zariMat);
      hem.rotation.x = Math.PI / 2;
      hem.position.y = 0.02;
      modelGroup.add(hem);
    } else if (config.silhouette === 'royal_saree') {
      const sareeGeo = new THREE.CylinderGeometry(waistRadius, 0.65, 1.3, 36, 16, true);
      const saree = new THREE.Mesh(sareeGeo, dressMat);
      saree.position.y = 0.65;
      saree.castShadow = true;
      modelGroup.add(saree);

      // Pallu drape
      const palluCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2, 0.7, 0.2),
        new THREE.Vector3(-0.25, 1.45, 0.2),
        new THREE.Vector3(-0.35, 1.85, 0.05),
        new THREE.Vector3(-0.55, 1.2, -0.15),
        new THREE.Vector3(-0.65, 0.2, -0.2),
      ]);
      const pallu = new THREE.Mesh(new THREE.TubeGeometry(palluCurve, 36, 0.13, 12, false), zariMat);
      modelGroup.add(pallu);
    } else {
      // Indo-Western Modern Fluted Trouser & Asymmetric Slit
      const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.38, 1.25, 24, 12, true), dressMat);
      leftLeg.position.set(-0.2, 0.62, 0);
      modelGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.38, 1.25, 24, 12, true), dressMat);
      rightLeg.position.set(0.2, 0.62, 0);
      modelGroup.add(rightLeg);

      // Asymmetric Drape
      const slitCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.3, 1.4, 0.1),
        new THREE.Vector3(0.25, 1.1, 0.25),
        new THREE.Vector3(0.45, 0.5, 0.25),
        new THREE.Vector3(0.55, 0.05, 0.15),
      ]);
      const slitDrape = new THREE.Mesh(new THREE.TubeGeometry(slitCurve, 28, 0.11, 10, false), zariMat);
      modelGroup.add(slitDrape);
    }
  }, [config]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[440px] lg:min-h-[580px] cursor-grab active:cursor-grabbing select-none"
      title="Drag to rotate custom silhouette in 360°"
    />
  );
};

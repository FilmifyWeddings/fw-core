'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const HeroCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFBF8F3);
    scene.fog = new THREE.FogExp2(0xFBF8F3, 0.045);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    // Initial cinematic wide angle position
    camera.position.set(0, 3.5, 8.8);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Lighting System
    const ambientLight = new THREE.AmbientLight(0xFAF4EB, 1.3);
    scene.add(ambientLight);

    const sunKeyLight = new THREE.DirectionalLight(0xFFF6E5, 2.4);
    sunKeyLight.position.set(4, 7, 4.5);
    sunKeyLight.castShadow = true;
    sunKeyLight.shadow.mapSize.width = 2048;
    sunKeyLight.shadow.mapSize.height = 2048;
    sunKeyLight.shadow.camera.near = 0.5;
    sunKeyLight.shadow.camera.far = 25;
    sunKeyLight.shadow.bias = -0.0001;
    scene.add(sunKeyLight);

    const rimGoldLight = new THREE.DirectionalLight(0xD4AF37, 1.8);
    rimGoldLight.position.set(-4.5, 4, -4);
    scene.add(rimGoldLight);

    const softFillLight = new THREE.PointLight(0xEADCC9, 1.2, 15);
    softFillLight.position.set(0, 1.5, 3.5);
    scene.add(softFillLight);

    // Dynamic mouse spotlight
    const mouseSpot = new THREE.SpotLight(0xFFF9EE, 1.5, 12, Math.PI / 6, 0.4, 1.2);
    mouseSpot.position.set(0, 4, 3);
    scene.add(mouseSpot);

    // 5. Architectural Royal Pavilion (Light Cream Sandstone & Ivory Marble)
    const pavilionGroup = new THREE.Group();

    // Polished Marble Reflective Floor
    const floorGeo = new THREE.PlaneGeometry(24, 24, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xF5EFEB,
      roughness: 0.22,
      metalness: 0.12,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.35;
    floor.receiveShadow = true;
    pavilionGroup.add(floor);

    // Stepped Circular Couture Plinth
    const plinthGeo1 = new THREE.CylinderGeometry(2.3, 2.5, 0.14, 48);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0xEFE8DC,
      roughness: 0.35,
      metalness: 0.1,
    });
    const plinth1 = new THREE.Mesh(plinthGeo1, plinthMat);
    plinth1.position.y = -1.28;
    plinth1.receiveShadow = true;
    pavilionGroup.add(plinth1);

    const plinthGeo2 = new THREE.CylinderGeometry(1.85, 2.0, 0.12, 48);
    const goldPlinthMat = new THREE.MeshStandardMaterial({
      color: 0xFDFBF7,
      roughness: 0.25,
      metalness: 0.15,
    });
    const plinth2 = new THREE.Mesh(plinthGeo2, goldPlinthMat);
    plinth2.position.y = -1.16;
    plinth2.receiveShadow = true;
    pavilionGroup.add(plinth2);

    // Antique Gold Brass Filigree Inlay Ring on Plinth
    const ringGeo = new THREE.TorusGeometry(1.88, 0.02, 16, 64);
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.25,
      metalness: 0.88,
    });
    const brassRing = new THREE.Mesh(ringGeo, goldTrimMat);
    brassRing.rotation.x = Math.PI / 2;
    brassRing.position.y = -1.1;
    pavilionGroup.add(brassRing);

    // Architectural Columns (Fluted Sandstone Pillars in Background)
    const columnPositions = [
      [-3.2, -1.3, -2.5],
      [3.2, -1.3, -2.5],
      [-4.6, -1.3, -4.5],
      [4.6, -1.3, -4.5],
      [-1.8, -1.3, -5.2],
      [1.8, -1.3, -5.2],
    ];

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0xF2ECE2,
      roughness: 0.45,
      metalness: 0.05,
    });

    columnPositions.forEach(([cx, cy, cz]) => {
      const colGroup = new THREE.Group();
      colGroup.position.set(cx, cy, cz);

      // Base
      const baseGeo = new THREE.BoxGeometry(0.55, 0.25, 0.55);
      const base = new THREE.Mesh(baseGeo, columnMat);
      base.position.y = 0.125;
      base.castShadow = true;
      base.receiveShadow = true;
      colGroup.add(base);

      // Shaft
      const shaftGeo = new THREE.CylinderGeometry(0.2, 0.22, 4.2, 24);
      const shaft = new THREE.Mesh(shaftGeo, columnMat);
      shaft.position.y = 2.225;
      shaft.castShadow = true;
      colGroup.add(shaft);

      // Capital / Crown
      const capGeo = new THREE.BoxGeometry(0.52, 0.2, 0.52);
      const cap = new THREE.Mesh(capGeo, columnMat);
      cap.position.y = 4.42;
      cap.castShadow = true;
      colGroup.add(cap);

      // Gold capital ring
      const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.015, 12, 32), goldTrimMat);
      capRing.rotation.x = Math.PI / 2;
      capRing.position.y = 4.3;
      colGroup.add(capRing);

      pavilionGroup.add(colGroup);
    });

    // Royal Sandstone Grand Arch (Mughal-inspired cusped portal in background)
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -4.5);

    // Arch Curves
    const curvePoints: THREE.Vector3[] = [];
    const archSegments = 32;
    for (let i = 0; i <= archSegments; i++) {
      const theta = (i / archSegments) * Math.PI;
      const r = 2.8 + Math.sin(theta * 3) * 0.18; // subtle cusped shape
      const ax = Math.cos(theta) * r;
      const ay = Math.sin(theta) * (r * 1.05) + 0.8;
      curvePoints.push(new THREE.Vector3(ax, ay, 0));
    }
    const archCurve = new THREE.CatmullRomCurve3(curvePoints);
    const archTubeGeo = new THREE.TubeGeometry(archCurve, 64, 0.12, 16, false);
    const archMesh = new THREE.Mesh(archTubeGeo, columnMat);
    archMesh.castShadow = true;
    archGroup.add(archMesh);

    // Inner Gold Arch Filigree Rib
    const innerArchGeo = new THREE.TubeGeometry(archCurve, 64, 0.025, 12, false);
    const innerGoldArch = new THREE.Mesh(innerArchGeo, goldTrimMat);
    innerGoldArch.position.z = 0.08;
    archGroup.add(innerGoldArch);

    pavilionGroup.add(archGroup);
    scene.add(pavilionGroup);

    // 6. High-Fashion Royal Bridal Silhouette (The Noor-e-Kashmir Ensemble)
    const mannequinGroup = new THREE.Group();
    mannequinGroup.position.set(0, -1.05, 0);

    // Haute Couture Mannequin Form
    // Slender Torso / Bodice with Royal Zari Corset
    const bodiceGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.75, 32);
    const bodiceMat = new THREE.MeshStandardMaterial({
      color: 0x821424, // Deep Royal Crimson / Noor Red
      roughness: 0.3,
      metalness: 0.45,
    });
    const bodice = new THREE.Mesh(bodiceGeo, bodiceMat);
    bodice.position.y = 1.62;
    bodice.castShadow = true;
    mannequinGroup.add(bodice);

    // Neck & Head abstract sculpture (Haute Couture style)
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 16);
    const alabasterMat = new THREE.MeshStandardMaterial({
      color: 0xFAF3E8,
      roughness: 0.25,
      metalness: 0.08,
    });
    const neck = new THREE.Mesh(neckGeo, alabasterMat);
    neck.position.y = 2.1;
    mannequinGroup.add(neck);

    const headGeo = new THREE.SphereGeometry(0.18, 32, 32);
    headGeo.scale(0.85, 1.15, 0.95);
    const head = new THREE.Mesh(headGeo, alabasterMat);
    head.position.y = 2.45;
    mannequinGroup.add(head);

    // Royal Maang Tikka / Matha Patti head ornament
    const tikkaGeo = new THREE.TorusGeometry(0.17, 0.012, 16, 32, Math.PI);
    const tikka = new THREE.Mesh(tikkaGeo, goldTrimMat);
    tikka.rotation.x = Math.PI / 2.2;
    tikka.position.set(0, 2.52, 0.02);
    mannequinGroup.add(tikka);

    const dropTikka = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 8), goldTrimMat);
    dropTikka.rotation.x = Math.PI;
    dropTikka.position.set(0, 2.38, 0.17);
    mannequinGroup.add(dropTikka);

    // Golden Zardozi Belt / Waistband (Kamarbandh)
    const beltGeo = new THREE.TorusGeometry(0.29, 0.03, 16, 48);
    const belt = new THREE.Mesh(beltGeo, goldTrimMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 1.25;
    mannequinGroup.add(belt);

    // Royal Flared Lehenga Skirt with dynamic folds
    // Using a custom cylinder mesh that bends and ripples
    const skirtHeight = 1.25;
    const skirtGeo = new THREE.CylinderGeometry(0.29, 1.25, skirtHeight, 48, 24, true);
    
    // Deform vertices to create 24 rich lehenga kalis/pleats
    const posAttr = skirtGeo.attributes.position;
    const initialPos = new Float32Array(posAttr.array);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);

      // Normalized height 0 (bottom) to 1 (top)
      const hNorm = (vy + skirtHeight / 2) / skirtHeight;
      const angle = Math.atan2(vz, vx);
      const radius = Math.sqrt(vx * vx + vz * vz);

      // Pleat wave amplitude larger at bottom
      const pleat = Math.sin(angle * 24) * (0.045 * (1.0 - hNorm * 0.7));
      const newR = radius + pleat;

      posAttr.setX(i, Math.cos(angle) * newR);
      posAttr.setZ(i, Math.sin(angle) * newR);
    }
    skirtGeo.computeVertexNormals();

    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x8A1224, // Velvet Crimson Noor
      roughness: 0.38,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = 0.62;
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    mannequinGroup.add(skirt);

    // Hemline Zardozi Gold Border (Heavy Gota Patti Border at bottom)
    const hemBorderGeo = new THREE.TorusGeometry(1.24, 0.045, 16, 64);
    const hemBorder = new THREE.Mesh(hemBorderGeo, goldTrimMat);
    hemBorder.rotation.x = Math.PI / 2;
    hemBorder.position.y = 0.03;
    mannequinGroup.add(hemBorder);

    // Royal Draped Dupatta (Flowing Organza Veil draped diagonally)
    const dupattaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 1.9, 0.05),  // Left shoulder
      new THREE.Vector3(-0.1, 1.5, 0.32),   // Across chest
      new THREE.Vector3(0.35, 1.15, 0.25),  // Right waist drape
      new THREE.Vector3(0.55, 0.7, 0.45),   // Flowing cascade
      new THREE.Vector3(0.75, 0.1, 0.35),   // Hem drop
    ]);
    const dupattaGeo = new THREE.TubeGeometry(dupattaCurve, 32, 0.14, 12, false);
    const dupattaMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.25,
      metalness: 0.75,
      transparent: true,
      opacity: 0.85,
    });
    const dupatta = new THREE.Mesh(dupattaGeo, dupattaMat);
    mannequinGroup.add(dupatta);

    scene.add(mannequinGroup);

    // 7. Floating Golden Shimmer & Dust Particles (Champagne Palace Dust)
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 1] = Math.random() * 5 - 1;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      particleSpeeds[i] = 0.003 + Math.random() * 0.006;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Particle texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 235, 175, 1)');
      grad.addColorStop(0.4, 'rgba(212, 175, 55, 0.7)');
      grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 32, 32);
    }
    const particleTex = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      map: particleTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. Mouse Parallax & Window Events
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop & Camera Dolly
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let dollyProgress = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth mouse lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Cinematic dolly-in from wide angle to intimate framing
      if (dollyProgress < 1) {
        dollyProgress += delta * 0.45; // ~2.2 seconds
        if (dollyProgress > 1) dollyProgress = 1;
        // Ease out cubic
        const t = 1 - Math.pow(1 - dollyProgress, 3);
        camera.position.z = THREE.MathUtils.lerp(8.8, 5.1, t);
        camera.position.y = THREE.MathUtils.lerp(3.5, 1.8, t);
      }

      // Parallax camera tilt reacting to mouse
      const targetCamX = mouseRef.current.x * 0.45;
      const targetCamY = 1.8 + mouseRef.current.y * 0.25;
      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.lookAt(0, 0.9, 0);

      // Light angle parallax shift
      mouseSpot.position.x = mouseRef.current.x * 2.5;
      mouseSpot.position.y = 4 + mouseRef.current.y * 1.2;
      mouseSpot.target = mannequinGroup;

      // Subtle slow majestic rotation of the mannequin
      mannequinGroup.rotation.y = Math.sin(time * 0.35) * 0.12 + mouseRef.current.x * 0.15;

      // Dynamic fabric breeze wave simulation on skirt
      const pArray = posAttr.array as Float32Array;
      for (let i = 0; i < posAttr.count; i++) {
        const initX = initialPos[i * 3];
        const initY = initialPos[i * 3 + 1];
        const initZ = initialPos[i * 3 + 2];

        const hNorm = (initY + skirtHeight / 2) / skirtHeight;
        // Breeze ripple amplitude higher at hem
        const wave = Math.sin(time * 2.2 + initX * 4.0 + initZ * 4.0) * (0.018 * (1.0 - hNorm));
        
        pArray[i * 3] = initX + wave * Math.sign(initX);
        pArray[i * 3 + 2] = initZ + wave * Math.sign(initZ);
      }
      posAttr.needsUpdate = true;

      // Floating dust particles motion
      const pPos = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pPos[i * 3 + 1] += particleSpeeds[i];
        if (pPos[i * 3 + 1] > 4.5) {
          pPos[i * 3 + 1] = -1.2;
        }
        // Subtle drift with mouse breeze
        pPos[i * 3] += Math.sin(time + i) * 0.0012 + mouseRef.current.x * 0.001;
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      skirtGeo.dispose();
      skirtMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Royal Sandstone Pavilion and Mannequin"
    />
  );
};

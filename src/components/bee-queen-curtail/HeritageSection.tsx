'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { soundCtrl } from './SoundController';
import { Landmark, Compass, Sparkles, Feather } from 'lucide-react';

const HERITAGE_PILLARS = [
  {
    num: '01',
    title: 'The Imperial Weavers of Benares',
    desc: 'Deep within the historic river ghats of Varanasi, our master artisans operate wooden pit looms passed down across five generations. Each thread of pure mulberry silk is guided by intuition, weaving tapestries once reserved exclusively for royal coronation drapes.',
  },
  {
    num: '02',
    title: 'Architectural Geometry of Indian Palaces',
    desc: 'From the intricate jali lattice work of Amber Fort to the lyrical scalloped cusps of Mughal palace corridors, our silhouette cuts are mathematical translations of royal architectural harmony engineered to drape seamlessly on the human form.',
  },
  {
    num: '03',
    title: 'Couture Re-Engineered for the 21st Century',
    desc: 'We preserve the opulence of heavy royal zardozi while shedding the physical burden. Through ergonomic internal corsetry, memory-drape pleats, and featherweight organza interlinings, our pieces empower the modern queen with absolute effortless grace.',
  },
];

export const HeritageSection: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFBF8F3);
    scene.fog = new THREE.Fog(0xFBF8F3, 3, 18);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.2, 8);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Warm Sun Ray Lighting
    const ambient = new THREE.AmbientLight(0xFAF4EB, 1.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xFFF2D6, 2.5);
    sun.position.set(5, 6, -2);
    scene.add(sun);

    const goldFill = new THREE.PointLight(0xD4AF37, 1.4, 15);
    goldFill.position.set(0, 2, 2);
    scene.add(goldFill);

    // 5. Architectural Corridor Geometry (Slow-Panning 3D Colonnade)
    const corridorGroup = new THREE.Group();

    // Marble Reflective Floor
    const floorGeo = new THREE.PlaneGeometry(16, 40, 16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xF3ECE1,
      roughness: 0.2,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    corridorGroup.add(floor);

    // Fluted Marble Pillars along the corridor
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xEFE8DC,
      roughness: 0.35,
      metalness: 0.05,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.2,
      metalness: 0.85,
    });

    for (let z = -15; z <= 10; z += 3.5) {
      [-2.4, 2.4].forEach((x) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 4.5, 24), pillarMat);
        pillar.position.set(x, 1.05, z);
        corridorGroup.add(pillar);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.48), pillarMat);
        cap.position.set(x, 3.3, z);
        corridorGroup.add(cap);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 12, 32), goldTrimMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 3.2, z);
        corridorGroup.add(ring);
      });
    }

    // Vaulted Ceiling Arches
    for (let z = -15; z <= 10; z += 3.5) {
      const archPoints = [];
      for (let i = 0; i <= 24; i++) {
        const theta = (i / 24) * Math.PI;
        const ax = Math.cos(theta) * 2.4;
        const ay = Math.sin(theta) * 1.6 + 3.2;
        archPoints.push(new THREE.Vector3(ax, ay, z));
      }
      const archCurve = new THREE.CatmullRomCurve3(archPoints);
      const archMesh = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 32, 0.08, 12, false), pillarMat);
      corridorGroup.add(archMesh);
    }

    scene.add(corridorGroup);

    // 6. Floating Golden Light Dust
    const dustCount = 120;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 6;
      dustPos[i * 3 + 1] = Math.random() * 4 - 0.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xD4AF37,
      transparent: true,
      opacity: 0.7,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // 7. Panning Animation Loop
    let animId: number;
    let cameraZ = 7;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Slow majestic pan down corridor
      cameraZ -= 0.005;
      if (cameraZ < 1) cameraZ = 7;
      camera.position.z = cameraZ;
      camera.position.x = Math.sin(cameraZ * 0.4) * 0.2;
      camera.lookAt(0, 1.2, cameraZ - 5);

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <section id="heritage" className="relative w-full py-28 sm:py-36 bg-[#FAF6F0] overflow-hidden select-none">
      
      {/* Background 3D Panning Architectural Corridor Canvas */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
      />

      {/* Gentle Lighting Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF6F0] via-transparent to-[#FAF6F0] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Landmark className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-sans tracking-[0.28em] uppercase text-[#D4AF37] font-semibold">
              The Philosophy & Lineage
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif text-[#2A2723] uppercase tracking-wide leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Brand Story & Royal Heritage
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#2A2723]/80 font-serif italic max-w-2xl mx-auto leading-relaxed">
            "Celebrating royal traditional heritage engineered with contemporary aesthetic precision for the modern queen."
          </p>
        </div>

        {/* Narrative Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HERITAGE_PILLARS.map((pillar) => (
            <div
              key={pillar.num}
              className="p-8 sm:p-10 rounded-3xl bg-[#FBF8F3]/90 backdrop-blur-md border border-[#EADCC9] shadow-[0_20px_50px_-20px_rgba(42,39,35,0.06)] flex flex-col justify-between hover:border-[#D4AF37] transition-all duration-300"
            >
              <div>
                <span className="text-3xl sm:text-4xl font-serif font-light text-[#D4AF37] block mb-4">
                  {pillar.num}
                </span>
                <h3
                  className="text-xl sm:text-2xl font-serif text-[#2A2723] tracking-wide mb-3"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#2A2723]/75 font-sans leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-[#EADCC9]/60 flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.2em] text-[#D4AF37]">
                <Feather className="w-3.5 h-3.5" />
                <span>Craft Preservation Lineage</span>
              </div>
            </div>
          ))}
        </div>

        {/* Royal Crest / Sanskrit Motto Banner */}
        <div className="mt-16 sm:mt-20 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#FAF5EC] via-[#FBF8F3] to-[#FAF5EC] border border-[#D4AF37]/40 text-center">
          <p className="text-xs sm:text-sm font-serif tracking-[0.3em] uppercase text-[#D4AF37] mb-2 font-medium">
            ॥ राजमहिषी वेशभूषा शाश्वत सौंदर्यम् ॥
          </p>
          <p className="text-lg sm:text-xl font-serif text-[#2A2723] max-w-xl mx-auto">
            "To adorn a queen is to consecrate history in silk, gold, and timeless grace."
          </p>
        </div>
      </div>
    </section>
  );
};

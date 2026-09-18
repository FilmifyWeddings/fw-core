'use client';

import React, { useState } from 'react';
import { VirtualFitting3D, FittingConfig } from './VirtualFitting3D';
import { soundCtrl } from './SoundController';
import { useCurrency } from './CurrencyContext';
import { 
  Sparkles, Sliders, Ruler, Check, Crown, Rotate3d, 
  Calendar, ArrowRight, ShieldCheck, Heart
} from 'lucide-react';

const SILHOUETTES = [
  { id: 'classic_lehenga', label: 'Classic 36-Kali Lehenga', basePrice: 420000, hours: 440 },
  { id: 'mermaid_flare', label: 'Contemporary Mermaid', basePrice: 380000, hours: 390 },
  { id: 'royal_saree', label: 'Pre-Draped Royal Saree', basePrice: 350000, hours: 320 },
  { id: 'indo_western', label: 'Indo-Western Slit Set', basePrice: 290000, hours: 260 },
] as const;

const BLOUSE_CUTS = [
  { id: 'sweetheart', label: 'Sweetheart Imperial' },
  { id: 'plunge_v', label: 'Deep Royal V' },
  { id: 'mandarin', label: 'High Mandarin Collar' },
  { id: 'backless_dori', label: 'Backless Royal Dori' },
] as const;

const FABRICS = [
  { id: 'katan_silk', label: 'Pure Varanasi Katan Silk', surcharge: 40000 },
  { id: 'crushed_velvet', label: 'Royal Crushed Velvet', surcharge: 60000 },
  { id: 'italian_organza', label: 'Italian Sheer Organza', surcharge: 30000 },
  { id: 'chiffon', label: 'Imperial Chiffon Georgette', surcharge: 20000 },
] as const;

const PALETTES = [
  { name: 'Royal Crimson', hex: '#821424' },
  { name: 'Alabaster Ivory', hex: '#F7F3E9' },
  { name: 'Sage Mint', hex: '#A8BAA3' },
  { name: 'Midnight Amethyst', hex: '#2E1A38' },
  { name: 'Antique Champagne', hex: '#D6C7B2' },
];

interface VirtualFittingRoomProps {
  onBookFitting: (customizationSummary: string) => void;
}

export const VirtualFittingRoom: React.FC<VirtualFittingRoomProps> = ({ onBookFitting }) => {
  const { formatPrice } = useCurrency();

  const [config, setConfig] = useState<FittingConfig>({
    silhouette: 'classic_lehenga',
    blouseCut: 'sweetheart',
    fabric: 'katan_silk',
    colorHex: '#821424',
    zariOpulence: 'heritage',
    measurements: {
      bust: 34,
      waist: 28,
      hip: 38,
      height: 168,
      unit: 'in',
    },
  });

  // Calculate live dynamic price and atelier hours
  const selectedSilhouette = SILHOUETTES.find((s) => s.id === config.silhouette) || SILHOUETTES[0];
  const selectedFabric = FABRICS.find((f) => f.id === config.fabric) || FABRICS[0];
  const zariSurcharge = config.zariOpulence === 'subtle' ? 0 : config.zariOpulence === 'heritage' ? 35000 : 75000;
  const totalPriceInr = selectedSilhouette.basePrice + selectedFabric.surcharge + zariSurcharge;

  const handleUnitToggle = (unit: 'cm' | 'in') => {
    soundCtrl.playClick();
    if (unit === config.measurements.unit) return;

    if (unit === 'cm') {
      setConfig((prev) => ({
        ...prev,
        measurements: {
          ...prev.measurements,
          bust: Math.round(prev.measurements.bust * 2.54),
          waist: Math.round(prev.measurements.waist * 2.54),
          hip: Math.round(prev.measurements.hip * 2.54),
          unit: 'cm',
        },
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        measurements: {
          ...prev.measurements,
          bust: Math.round(prev.measurements.bust / 2.54),
          waist: Math.round(prev.measurements.waist / 2.54),
          hip: Math.round(prev.measurements.hip / 2.54),
          unit: 'in',
        },
      }));
    }
  };

  const handleBook = () => {
    soundCtrl.playChime(792);
    const summary = `${selectedSilhouette.label} in ${selectedFabric.label} (${config.colorHex}), Blouse: ${config.blouseCut}, Zari: ${config.zariOpulence.toUpperCase()}, Measurements: B${config.measurements.bust}/W${config.measurements.waist}/H${config.measurements.hip} ${config.measurements.unit}`;
    onBookFitting(summary);
  };

  return (
    <section id="virtual-fitting" className="relative w-full py-24 sm:py-32 bg-[#FBF8F3] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sliders className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-sans tracking-[0.28em] uppercase text-[#D4AF37] font-semibold">
              Interactive 3D Bespoke Tailoring
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif text-[#2A2723] uppercase tracking-wide leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Virtual Dressing Room
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#2A2723]/75 font-sans max-w-xl mx-auto">
            Configure your bespoke bridal or couture silhouette in real-time 3D. Inspect drape physics, gold embroidery opulence, and customized measurements.
          </p>
        </div>

        {/* Split Screen Luxury Atelier Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          
          {/* Left Panel: Configuration Controls (7 cols on lg) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-8 bg-[#FAF6F0] p-6 sm:p-8 rounded-3xl border border-[#EADCC9] shadow-[0_15px_40px_-15px_rgba(42,39,35,0.05)]">
            
            {/* 1. Silhouette Selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-sans tracking-[0.2em] uppercase text-[#2A2723]/70 font-semibold">
                  1. Select Sovereign Silhouette
                </span>
                <span className="text-[11px] font-sans text-[#D4AF37] font-medium">
                  {selectedSilhouette.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {SILHOUETTES.map((sil) => (
                  <button
                    key={sil.id}
                    onClick={() => {
                      soundCtrl.playClick();
                      soundCtrl.playFabricSwoosh();
                      setConfig((prev) => ({ ...prev, silhouette: sil.id }));
                    }}
                    className={`p-3 rounded-xl text-left border transition-all duration-300 ${
                      config.silhouette === sil.id
                        ? 'bg-[#2A2723] text-[#FAF8F3] border-[#2A2723] shadow-sm'
                        : 'bg-[#FBF8F3] text-[#2A2723]/80 border-[#EADCC9] hover:border-[#D4AF37]'
                    }`}
                  >
                    <span className="text-xs font-serif font-bold block">{sil.label}</span>
                    <span className={`text-[10px] font-sans block mt-0.5 ${config.silhouette === sil.id ? 'text-[#D4AF37]' : 'text-[#2A2723]/60'}`}>
                      {formatPrice(sil.basePrice)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Blouse Cut */}
            <div>
              <span className="text-xs font-sans tracking-[0.2em] uppercase text-[#2A2723]/70 font-semibold block mb-3">
                2. Imperial Blouse Neckline
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BLOUSE_CUTS.map((bc) => (
                  <button
                    key={bc.id}
                    onClick={() => {
                      soundCtrl.playClick();
                      setConfig((prev) => ({ ...prev, blouseCut: bc.id }));
                    }}
                    className={`p-2.5 rounded-xl text-xs font-sans text-center border transition-all ${
                      config.blouseCut === bc.id
                        ? 'bg-[#FAF5EC] border-[#D4AF37] text-[#2A2723] font-bold shadow-xs'
                        : 'bg-[#FBF8F3] border-[#EADCC9] text-[#2A2723]/70 hover:border-[#D4AF37]/50'
                    }`}
                  >
                    {bc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Fabric & Weave */}
            <div>
              <span className="text-xs font-sans tracking-[0.2em] uppercase text-[#2A2723]/70 font-semibold block mb-3">
                3. Ancestral Fabric & Weave
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {FABRICS.map((fab) => (
                  <button
                    key={fab.id}
                    onClick={() => {
                      soundCtrl.playClick();
                      soundCtrl.playFabricSwoosh();
                      setConfig((prev) => ({ ...prev, fabric: fab.id }));
                    }}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      config.fabric === fab.id
                        ? 'bg-[#2A2723] text-[#FAF8F3] border-[#2A2723]'
                        : 'bg-[#FBF8F3] text-[#2A2723]/80 border-[#EADCC9] hover:border-[#D4AF37]'
                    }`}
                  >
                    <span className="text-xs font-serif font-semibold block">{fab.label}</span>
                    <span className={`text-[10px] font-sans block ${config.fabric === fab.id ? 'text-[#D4AF37]' : 'text-[#2A2723]/60'}`}>
                      +{formatPrice(fab.surcharge)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Royal Color Swatches & Zari Opulence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-[#EADCC9]">
              <div>
                <span className="text-xs font-sans tracking-[0.2em] uppercase text-[#2A2723]/70 font-semibold block mb-2.5">
                  Color Shade
                </span>
                <div className="flex items-center gap-2">
                  {PALETTES.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        soundCtrl.playClick();
                        soundCtrl.playFabricSwoosh();
                        setConfig((prev) => ({ ...prev, colorHex: p.hex }));
                      }}
                      className={`w-7 h-7 rounded-full border transition-all ${
                        config.colorHex === p.hex
                          ? 'border-[#D4AF37] scale-125 shadow-md ring-2 ring-[#D4AF37]/30'
                          : 'border-[#EADCC9]'
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-sans tracking-[0.2em] uppercase text-[#2A2723]/70 font-semibold block mb-2.5">
                  Zari Density
                </span>
                <div className="flex items-center gap-1.5">
                  {(['subtle', 'heritage', 'imperial'] as const).map((z) => (
                    <button
                      key={z}
                      onClick={() => {
                        soundCtrl.playClick();
                        setConfig((prev) => ({ ...prev, zariOpulence: z }));
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-sans uppercase tracking-wider border transition-all ${
                        config.zariOpulence === z
                          ? 'bg-[#D4AF37] text-[#2A2723] font-bold border-[#D4AF37]'
                          : 'bg-[#FBF8F3] text-[#2A2723]/70 border-[#EADCC9]'
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Custom Measurements Sliders */}
            <div className="pt-4 border-t border-[#EADCC9]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-sans tracking-[0.2em] uppercase text-[#2A2723]/80 font-semibold">
                    Custom Anatomical Metrics
                  </span>
                </div>
                
                {/* Metric Unit Toggle */}
                <div className="flex items-center rounded-full bg-[#EFE8DC] p-0.5 border border-[#EADCC9]">
                  <button
                    onClick={() => handleUnitToggle('in')}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase ${
                      config.measurements.unit === 'in'
                        ? 'bg-[#2A2723] text-[#FAF8F3]'
                        : 'text-[#2A2723]/60'
                    }`}
                  >
                    Inches
                  </button>
                  <button
                    onClick={() => handleUnitToggle('cm')}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase ${
                      config.measurements.unit === 'cm'
                        ? 'bg-[#2A2723] text-[#FAF8F3]'
                        : 'text-[#2A2723]/60'
                    }`}
                  >
                    CM
                  </button>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-sans text-[#2A2723]/70 mb-1">
                    <span>Bust</span>
                    <span className="font-semibold text-[#2A2723]">
                      {config.measurements.bust} {config.measurements.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={config.measurements.unit === 'in' ? 28 : 70}
                    max={config.measurements.unit === 'in' ? 44 : 112}
                    value={config.measurements.bust}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        measurements: { ...prev.measurements, bust: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-[#D4AF37] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-sans text-[#2A2723]/70 mb-1">
                    <span>Waist</span>
                    <span className="font-semibold text-[#2A2723]">
                      {config.measurements.waist} {config.measurements.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={config.measurements.unit === 'in' ? 22 : 55}
                    max={config.measurements.unit === 'in' ? 38 : 96}
                    value={config.measurements.waist}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        measurements: { ...prev.measurements, waist: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-[#D4AF37] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-sans text-[#2A2723]/70 mb-1">
                    <span>Hip</span>
                    <span className="font-semibold text-[#2A2723]">
                      {config.measurements.hip} {config.measurements.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={config.measurements.unit === 'in' ? 32 : 80}
                    max={config.measurements.unit === 'in' ? 48 : 122}
                    value={config.measurements.hip}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        measurements: { ...prev.measurements, hip: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-[#D4AF37] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Price & Book Bespoke Fitting Trigger */}
            <div className="pt-6 border-t border-[#EADCC9] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/60 block">
                  Total Bespoke Estimate
                </span>
                <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2A2723]">
                  {formatPrice(totalPriceInr)}
                </span>
                <span className="text-[11px] font-sans text-[#D4AF37] block mt-0.5">
                  Est. {selectedSilhouette.hours} Atelier Handcraft Hours
                </span>
              </div>

              <button
                onClick={handleBook}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#2A2723] text-[#FAF8F3] text-xs font-sans font-semibold tracking-[0.2em] uppercase border border-[#D4AF37] hover:bg-[#FAF6F0] hover:text-[#2A2723] transition-all shadow-md flex items-center justify-center gap-2 group"
              >
                <span>Book Bespoke Fitting</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Panel: Live Full-Height 3D Interactive Stage (6 cols on lg) */}
          <div className="lg:col-span-6 relative rounded-3xl bg-[#FAF6F0] border border-[#EADCC9] shadow-[0_15px_40px_-15px_rgba(42,39,35,0.05)] overflow-hidden flex flex-col justify-between">
            
            {/* Top 3D Stage Info Bar */}
            <div className="relative z-10 flex items-center justify-between p-4 sm:p-6 border-b border-[#EADCC9]/60 bg-[#FBF8F3]/70 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-sans font-semibold tracking-widest uppercase text-[#2A2723]">
                  Real-Time 3D Live Simulation
                </span>
              </div>
              <span className="text-[10px] font-sans uppercase tracking-widest text-[#D4AF37] px-2.5 py-1 rounded-full bg-[#FAF5EC] border border-[#D4AF37]/30">
                PBR WebGL 60FPS
              </span>
            </div>

            {/* The 3D Fitting Canvas */}
            <div className="relative w-full flex-1 flex items-center justify-center">
              <VirtualFitting3D config={config} />

              {/* Floating Orbit Pill */}
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FBF8F3]/80 border border-[#EADCC9] text-[11px] font-sans tracking-widest text-[#2A2723]/70 uppercase pointer-events-none">
                <Rotate3d className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Drag to Rotate 360°</span>
              </div>
            </div>

            {/* Bottom 3D Footnote */}
            <div className="relative z-10 p-4 bg-[#FAF5EC] border-t border-[#EADCC9]/60 text-center">
              <p className="text-[11px] font-sans text-[#2A2723]/70">
                Includes complimentary video consultation with Head Drape Master upon reservation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

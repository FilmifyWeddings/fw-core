'use client';

import React, { useState } from 'react';
import { soundCtrl } from './SoundController';
import { Play, Sparkles, X, Eye, ZoomIn, Scissors, Feather, Compass } from 'lucide-react';

interface AtelierItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  image: string;
  videoUrl?: string;
  heightClass: string;
  technique: string;
  artisanQuote: string;
  origin: string;
  hours: string;
}

const ATELIER_ITEMS: AtelierItem[] = [
  {
    id: 'look-1',
    title: 'The Varanasi Gold Loom',
    subtitle: 'Woven with 4,800 Pure Mulberry Silk Threads',
    category: 'Heritage Weave',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=1200&auto=format&fit=crop',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-an-elegant-dress-40939-large.mp4',
    heightClass: 'h-[440px]',
    technique: 'Kadwa Brocade & Silver-Gilded Weft',
    artisanQuote: 'Each motif requires two weavers operating in harmonious rhythm, throwing shuttles by instinct honed over four generations.',
    origin: 'Varanasi Royal Ghats, India',
    hours: '280 Hours on Pit Loom',
  },
  {
    id: 'look-2',
    title: 'Imperial Runway Catwalk',
    subtitle: 'The Noor-e-Kashmir in Fluid Regal Motion',
    category: 'Runway Motion',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1200&auto=format&fit=crop',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-in-a-traditional-indian-dress-41009-large.mp4',
    heightClass: 'h-[320px]',
    technique: 'Aerodynamic Flared 36-Kali Construction',
    artisanQuote: 'Weight distribution is the silent secret of couture: 7 meters of royal velvet engineered to feel like morning mist.',
    origin: 'New Delhi Haute Couture Salon',
    hours: '460 Atelier Hours',
  },
  {
    id: 'look-3',
    title: 'Macro Zardozi Bullion Wire',
    subtitle: 'Hand-Beaten 24k Electroplated Antique Gold',
    category: 'Embroidery Macro',
    image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?q=80&w=1200&auto=format&fit=crop',
    heightClass: 'h-[360px]',
    technique: 'Dabka & Salma Micro-Stitching',
    artisanQuote: 'A single flower medallion consumes over 12,000 microscopic needle punches to achieve sculpted three-dimensional relief.',
    origin: 'Lucknow Zari Guild',
    hours: '190 Hours Needlework',
  },
  {
    id: 'look-4',
    title: 'The Sheesh Mahal Mirror Facets',
    subtitle: 'Hand-Cut Convex Mirrors Embedded in Silver Bezels',
    category: 'Royal Embellishment',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop',
    heightClass: 'h-[460px]',
    technique: 'Thikri Mirror Setting on Raw Georgette',
    artisanQuote: 'When illuminated under candle flame or starlight, the gown transforms into a living celestial constellation.',
    origin: 'Jaipur Palace Crafts',
    hours: '310 Hours Craftsmanship',
  },
  {
    id: 'look-5',
    title: 'Master Drape & Silhouette Fitting',
    subtitle: 'Precision Measurement & Structural Architecture',
    category: 'Atelier Fitting',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop',
    heightClass: 'h-[340px]',
    technique: 'Bespoke Haute Corsetry',
    artisanQuote: 'We do not simply fit the body; we sculpt a sovereign silhouette that empowers every movement.',
    origin: 'Mayfair London Flagship Studio',
    hours: '5 Master Fittings',
  },
  {
    id: 'look-6',
    title: 'Gota Patti Petal Architecture',
    subtitle: 'Lacquered Gold Foil Appliqué with Seed Pearls',
    category: 'Textile Ornament',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    heightClass: 'h-[380px]',
    technique: 'Folded Ribbon Appliqué on Silk Organza',
    artisanQuote: 'Petals folded like origami and anchored with natural gum and silver thread that outlasts centuries.',
    origin: 'Bikaner Court Weavers',
    hours: '140 Hours Hand Detailing',
  },
];

export const AtelierSection: React.FC = () => {
  const [activeModalItem, setActiveModalItem] = useState<AtelierItem | null>(null);
  const [zoomRatio, setZoomRatio] = useState(1);

  const handleOpenModal = (item: AtelierItem) => {
    soundCtrl.playChime(660);
    setActiveModalItem(item);
    setZoomRatio(1);
  };

  const handleCloseModal = () => {
    soundCtrl.playClick();
    setActiveModalItem(null);
  };

  return (
    <section id="atelier" className="relative w-full py-24 sm:py-32 bg-[#FAF6F0] overflow-hidden">
      
      {/* Subtle Background Flourish */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scissors className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-sans tracking-[0.28em] uppercase text-[#D4AF37] font-semibold">
              Heritage Craftsmanship & Archives
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif text-[#2A2723] uppercase tracking-wide leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            The Atelier & Editorial Lookbook
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#2A2723]/75 font-serif max-w-xl mx-auto italic">
            "Where ancestral handloom alchemy converges with high-fashion architecture."
          </p>
        </div>

        {/* Masonry-Style Lookbook Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {ATELIER_ITEMS.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenModal(item)}
              className={`group relative w-full ${item.heightClass} rounded-2xl sm:rounded-3xl overflow-hidden bg-[#FBF8F3] border border-[#EADCC9] shadow-[0_15px_40px_-15px_rgba(42,39,35,0.06)] cursor-pointer break-inside-avoid transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#D4AF37]/80`}
            >
              {/* Card Image */}
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
                loading="lazy"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#2A2723]/90 via-[#2A2723]/25 to-transparent transition-opacity duration-300 opacity-80 group-hover:opacity-90" />

              {/* Top Tag */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EC]/90 backdrop-blur-xs text-[10px] font-sans font-semibold tracking-wider text-[#2A2723] uppercase border border-[#D4AF37]/40 shadow-xs">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>{item.category}</span>
              </div>

              {/* Video Play Badge if applicable */}
              {item.videoUrl && (
                <div className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#2A2723]/70 backdrop-blur-xs border border-[#FAF5EC]/30 flex items-center justify-center text-[#FAF8F3] group-hover:scale-110 transition-transform">
                  <Play className="w-3.5 h-3.5 ml-0.5 fill-current text-[#D4AF37]" />
                </div>
              )}

              {/* Bottom Information */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10 text-left">
                <span className="text-[10px] font-sans tracking-[0.2em] uppercase text-[#D4AF37] block mb-1">
                  {item.origin}
                </span>
                <h3
                  className="text-xl font-serif text-[#FAF8F3] tracking-wide mb-1"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {item.title}
                </h3>
                <p className="text-xs text-[#FAF8F3]/75 font-sans line-clamp-2">
                  {item.subtitle}
                </p>

                {/* Hover Reveal CTA */}
                <div className="mt-3 flex items-center gap-2 text-[11px] font-sans font-medium tracking-widest text-[#D4AF37] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect High-Res Archive</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Luxury Lightbox Modal */}
      {activeModalItem && (
        <div
          onClick={handleCloseModal}
          className="fixed inset-0 z-50 bg-[#2A2723]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-[#FBF8F3] border border-[#D4AF37] rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[90vh]"
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-30 p-2 rounded-full bg-[#2A2723]/70 text-[#FAF8F3] hover:bg-[#2A2723] hover:text-[#D4AF37] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Media Viewport (Video or High-Res Zoomable Image) */}
            <div className="relative w-full lg:w-3/5 h-[340px] sm:h-[420px] lg:h-auto bg-[#1A1816] overflow-hidden flex items-center justify-center">
              {activeModalItem.videoUrl ? (
                <video
                  src={activeModalItem.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="relative w-full h-full overflow-hidden flex items-center justify-center cursor-zoom-in"
                  onClick={() => setZoomRatio((prev) => (prev === 1 ? 1.75 : 1))}
                >
                  <img
                    src={activeModalItem.image}
                    alt={activeModalItem.title}
                    style={{ transform: `scale(${zoomRatio})` }}
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                  <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-[#2A2723]/80 text-[#FAF8F3] text-[10px] uppercase tracking-widest font-sans flex items-center gap-1.5">
                    <ZoomIn className="w-3 h-3 text-[#D4AF37]" />
                    <span>Click to {zoomRatio === 1 ? 'Magnify Weave' : 'Reset'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Curatorial Details */}
            <div className="w-full lg:w-2/5 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-[#FBF8F3]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-sans tracking-[0.24em] uppercase text-[#D4AF37] font-semibold">
                    {activeModalItem.category}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37]" />
                  <span className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/60">
                    {activeModalItem.origin}
                  </span>
                </div>

                <h3
                  className="text-2xl sm:text-3xl font-serif text-[#2A2723] leading-tight mb-2"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {activeModalItem.title}
                </h3>

                <p className="text-sm font-serif italic text-[#2A2723]/80 mb-6">
                  {activeModalItem.subtitle}
                </p>

                {/* Technical Specifications */}
                <div className="space-y-4 py-4 border-y border-[#EADCC9]">
                  <div>
                    <span className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/60 block mb-1">
                      Artisanal Technique
                    </span>
                    <span className="text-sm font-sans font-medium text-[#2A2723]">
                      {activeModalItem.technique}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-sans tracking-widest uppercase text-[#2A2723]/60 block mb-1">
                      Dedicated Handwork
                    </span>
                    <span className="text-sm font-sans font-medium text-[#2A2723]">
                      {activeModalItem.hours}
                    </span>
                  </div>
                </div>

                {/* Master Artisan Quote */}
                <div className="mt-6 p-4 rounded-2xl bg-[#FAF5EC] border border-[#D4AF37]/30">
                  <p className="text-xs font-serif italic text-[#2A2723]/85 leading-relaxed">
                    "{activeModalItem.artisanQuote}"
                  </p>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="mt-8 pt-4 border-t border-[#EADCC9]">
                <button
                  onClick={() => {
                    soundCtrl.playClick();
                    handleCloseModal();
                  }}
                  className="w-full py-3 rounded-full bg-[#2A2723] text-[#FAF8F3] text-xs font-sans font-semibold tracking-[0.2em] uppercase hover:bg-[#D4AF37] hover:text-[#2A2723] transition-colors"
                >
                  Close Archive View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

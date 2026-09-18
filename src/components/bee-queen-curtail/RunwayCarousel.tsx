'use client';

import React, { useState } from 'react';
import { DressViewer3D, ProductData } from './DressViewer3D';
import { soundCtrl } from './SoundController';
import { Sparkles, ChevronLeft, ChevronRight, Crown, Layers, Award } from 'lucide-react';

const RUNWAY_PRODUCTS: ProductData[] = [
  {
    id: 'noor-e-kashmir',
    name: 'The Noor-e-Kashmir Velvet Lehenga',
    nameHindi: 'नूर-ए-कश्मीर लहंगा',
    tagline: 'Imperial Bridal Heirloom in Deep Velvet & Real Zari',
    category: 'Royal Bridal Lehenga',
    basePriceInr: 485000,
    silhouetteType: 'lehenga',
    editorialImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1200&auto=format&fit=crop',
    editorialVideoGif: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-an-elegant-dress-40939-large.mp4',
    swatches: [
      { name: 'Royal Crimson', hex: '#821424', threeColor: 0x821424, zariColor: 0xD4AF37 },
      { name: 'Imperial Emerald', hex: '#1B3B2B', threeColor: 0x1B3B2B, zariColor: 0xD4AF37 },
      { name: 'Alabaster Ivory Gold', hex: '#F7F3E9', threeColor: 0xF7F3E9, zariColor: 0xC59E38 },
      { name: 'Midnight Amethyst', hex: '#2E1A38', threeColor: 0x2E1A38, zariColor: 0xE8D394 },
    ],
    hotspots: [
      {
        id: 'hs-bodice',
        title: '3D Zardozi Wirework',
        desc: 'Hand-beaten metallic bullion wire woven with pure silk thread using authentic 17th-century Mughal needlepoint technique.',
        pos3D: [0, 0.5, 0.32],
        tag: 'Artisanal Embroidery',
      },
      {
        id: 'hs-border',
        title: 'Scalloped Gota Patti Hemline',
        desc: '36-kali flared skirt weighted with double-stitched organza interlining and 24-karat electroplated gold dabka borders.',
        pos3D: [0, -0.9, 1.15],
        tag: 'Hemline Engineering',
      },
      {
        id: 'hs-dupatta',
        title: 'Veil of Benaras',
        desc: 'Weightless Italian tissue organza with delicate hand-embroidered floral jaal and hand-sewn micro-pearl fringes.',
        pos3D: [0.35, 0.15, 0.25],
        tag: 'Textile Innovation',
      },
    ],
    craftSpecs: [
      { label: 'Atelier Hours', value: '460 Hours Handwork' },
      { label: 'Weave Origin', value: 'Varanasi Royal Looms' },
      { label: 'Zari Purity', value: '98.5% Silver Core Gold Plated' },
      { label: 'Flare Diameter', value: '6.8 Meters (36 Kalis)' },
    ],
    story: 'Conceived in the royal ateliers of Kashmir and woven across the ancestral looms of Benares, the Noor-e-Kashmir is a sovereign bridal statement that bridges Mughal architectural geometry with modern light-weighted luxury.',
  },
  {
    id: 'maharani-chandrakanta',
    name: 'The Maharani Chandrakanta Draped Saree',
    nameHindi: 'महारानी चंद्रकांता साड़ी',
    tagline: 'Sculptural Pre-Draped Royal Chanderi with Basra Pearl Pallu',
    category: 'Imperial Draped Saree',
    basePriceInr: 360000,
    silhouetteType: 'saree',
    editorialImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=1200&auto=format&fit=crop',
    editorialVideoGif: 'https://assets.mixkit.co/videos/preview/mixkit-woman-in-a-traditional-indian-dress-41009-large.mp4',
    swatches: [
      { name: 'Champagne Pearl', hex: '#EAE3D2', threeColor: 0xEAE3D2, zariColor: 0xD4AF37 },
      { name: 'Gulabi Rose', hex: '#C26374', threeColor: 0xC26374, zariColor: 0xE6D090 },
      { name: 'Royal Peacock', hex: '#114B5F', threeColor: 0x114B5F, zariColor: 0xD4AF37 },
      { name: 'Sindoor Scarlet', hex: '#9C252D', threeColor: 0x9C252D, zariColor: 0xD4AF37 },
    ],
    hotspots: [
      {
        id: 'hs-pallu',
        title: 'Cascade Scallop Pallu',
        desc: 'Fluid shoulder drape with embedded memory wire that maintains an immaculate razor-sharp pleat throughout wedding receptions.',
        pos3D: [-0.4, 0.35, 0.15],
        tag: 'Drape Innovation',
      },
      {
        id: 'hs-pleats',
        title: 'Micro-Accordion Pleats',
        desc: 'Pre-stitched silk pleats that flatter every silhouette without cumbersome draping or safety pins.',
        pos3D: [0, -0.4, 0.65],
        tag: 'Effortless Haute Couture',
      },
    ],
    craftSpecs: [
      { label: 'Fabric Composition', value: '100% Chanderi Mulberry Silk' },
      { label: 'Embellishment', value: 'Seed Pearls & Marodi Zari' },
      { label: 'Draping Time', value: 'Instant (< 45 Seconds)' },
      { label: 'Weight', value: '1.45 kg Ultra-Balanced' },
    ],
    story: 'Inspired by the regal wardrobe of Queen Chandrakanta, this gown-saree hybrid transforms the timeless drape into an effortless sculptural silhouette for the modern sovereign.',
  },
  {
    id: 'mumtaz-anarkali',
    name: 'The Mumtaz Flared Anarkali Gown',
    nameHindi: 'मुमताज़ अनारकली गाउन',
    tagline: 'Floor-Sweeping Royal Silhouette with Mirrorwork Medallions',
    category: 'Grand Anarkali Couture',
    basePriceInr: 325000,
    silhouetteType: 'anarkali',
    editorialImage: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?q=80&w=1200&auto=format&fit=crop',
    editorialVideoGif: '',
    swatches: [
      { name: 'Sage Mint Pistachio', hex: '#B8C5B2', threeColor: 0xB8C5B2, zariColor: 0xD4AF37 },
      { name: 'Deep Saffron Ochre', hex: '#D27D2D', threeColor: 0xD27D2D, zariColor: 0x96601B },
      { name: 'Ivory Sandstone', hex: '#FAF5EC', threeColor: 0xFAF5EC, zariColor: 0xD4AF37 },
      { name: 'Royal Persian Blue', hex: '#1C3144', threeColor: 0x1C3144, zariColor: 0xD4AF37 },
    ],
    hotspots: [
      {
        id: 'hs-bodice-anarkali',
        title: 'Hand-Cut Convex Mirrors',
        desc: 'Custom-faceted royal mirrors set in delicate gilded bezels, capturing chandelier light like constellations in motion.',
        pos3D: [0, 0.6, 0.28],
        tag: 'Sheesh Mahal Craft',
      },
      {
        id: 'hs-ghera',
        title: 'Double-Layered Georgette Ghera',
        desc: '72 hand-cut panels delivering an ethereal 360° spin on the ballroom floor.',
        pos3D: [0, -0.6, 0.85],
        tag: 'Ballroom Motion',
      },
    ],
    craftSpecs: [
      { label: 'Atelier Work', value: '380 Hours' },
      { label: 'Ghera Circumference', value: '8.2 Meters' },
      { label: 'Mirror Count', value: '2,400 Hand-Set Mirrors' },
      { label: 'Lining', value: 'Pure Butter Crepe Silk' },
    ],
    story: 'A tribute to the poetic grace of the Mughal court, reimagined with lightweight aerodynamic layers that float weightlessly with every step.',
  },
  {
    id: 'jodha-fusion-cape',
    name: 'The Jodha Fusion Cape & Sharara',
    nameHindi: 'जोधा फ़्यूज़न केप सेट',
    tagline: 'Indo-Western Architectural Corset with Translucent Silk Cape',
    category: 'Indo-Western Fusion Set',
    basePriceInr: 295000,
    silhouetteType: 'fusion',
    editorialImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop',
    editorialVideoGif: '',
    swatches: [
      { name: 'Cashmere Champagne', hex: '#EADCC9', threeColor: 0xEADCC9, zariColor: 0xD4AF37 },
      { name: 'Midnight Noir Gold', hex: '#1F1E1D', threeColor: 0x1F1E1D, zariColor: 0xD4AF37 },
      { name: 'Dusty Lilac Mauve', hex: '#A892A0', threeColor: 0xA892A0, zariColor: 0xD4AF37 },
      { name: 'Terracotta Rust', hex: '#A84B34', threeColor: 0xA84B34, zariColor: 0xD4AF37 },
    ],
    hotspots: [
      {
        id: 'hs-corset',
        title: 'Architectural Boned Corset',
        desc: 'Ergonomic internal spiral steel boning providing structural support with zero constraint.',
        pos3D: [0, 0.55, 0.28],
        tag: 'Couture Corsetry',
      },
      {
        id: 'hs-cape',
        title: 'Trailing Organza Wings',
        desc: 'Sheer trailing wings patterned with laser-cut filigree floral motifs finished with hand zardozi stitching.',
        pos3D: [0.4, 0.1, 0.5],
        tag: 'Contemporary Drama',
      },
    ],
    craftSpecs: [
      { label: 'Style Silhouette', value: 'Corset Blouse + Fluted Sharara + Cape' },
      { label: 'Fabric Weave', value: 'Italian Organza & Silk Taffeta' },
      { label: 'Occasion', value: 'Sangeet, Cocktail & Reception' },
      { label: 'Custom Fit', value: '14 Precision Body Metrics' },
    ],
    story: 'Bold, sovereign, and unapologetically contemporary. The Jodha fusion set unites fierce architectural lines with the soft romanticism of royal Indian handloom.',
  },
];

interface RunwayCarouselProps {
  onInquireProduct: (product: ProductData) => void;
}

export const RunwayCarousel: React.FC<RunwayCarouselProps> = ({ onInquireProduct }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeProduct = RUNWAY_PRODUCTS[currentIndex];

  const handlePrev = () => {
    soundCtrl.playClick();
    soundCtrl.playFabricSwoosh();
    setCurrentIndex((prev) => (prev === 0 ? RUNWAY_PRODUCTS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    soundCtrl.playClick();
    soundCtrl.playFabricSwoosh();
    setCurrentIndex((prev) => (prev === RUNWAY_PRODUCTS.length - 1 ? 0 : prev + 1));
  };

  return (
    <section id="runway" className="relative w-full py-24 sm:py-32 bg-[#FBF8F3] overflow-hidden">
      
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-[#D4AF37]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 border-b border-[#EADCC9] pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-sans tracking-[0.26em] uppercase text-[#D4AF37] font-semibold">
                Curated Runway Showcase
              </span>
            </div>
            <h2
              className="text-3xl sm:text-5xl font-serif text-[#2A2723] uppercase tracking-wide leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Interactive 3D Runway
            </h2>
          </div>

          <p className="mt-4 md:mt-0 text-sm text-[#2A2723]/70 font-sans max-w-md">
            Rotate the garment in 360° 3D space, interact with artisanal craftsmanship pins, switch colorways, or inspect real runway editorial captures.
          </p>
        </div>

        {/* Carousel Dress Navigation Tabs */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {RUNWAY_PRODUCTS.map((prod, idx) => (
            <button
              key={prod.id}
              onClick={() => {
                soundCtrl.playClick();
                setCurrentIndex(idx);
              }}
              className={`px-4 sm:px-6 py-2.5 rounded-full text-xs font-sans tracking-[0.14em] uppercase transition-all duration-300 whitespace-nowrap flex items-center gap-2 border ${
                currentIndex === idx
                  ? 'bg-[#2A2723] text-[#FAF8F3] border-[#2A2723] shadow-md'
                  : 'bg-[#FAF6F0] text-[#2A2723]/70 border-[#EADCC9] hover:border-[#D4AF37]'
              }`}
            >
              <span className="text-[#D4AF37] font-serif font-bold">0{idx + 1}.</span>
              <span>{prod.name}</span>
            </button>
          ))}
        </div>

        {/* The 3D Interactive Stage Component */}
        <div className="relative">
          <DressViewer3D
            product={activeProduct}
            onInquire={onInquireProduct}
          />

          {/* Carousel Arrows */}
          <div className="hidden lg:flex items-center justify-between absolute top-1/2 -translate-y-1/2 -left-6 -right-6 pointer-events-none z-30">
            <button
              onClick={handlePrev}
              className="pointer-events-auto p-3.5 rounded-full bg-[#FBF8F3] border border-[#D4AF37] text-[#2A2723] hover:bg-[#2A2723] hover:text-[#FAF8F3] transition-all shadow-xl"
              aria-label="Previous dress"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="pointer-events-auto p-3.5 rounded-full bg-[#FBF8F3] border border-[#D4AF37] text-[#2A2723] hover:bg-[#2A2723] hover:text-[#FAF8F3] transition-all shadow-xl"
              aria-label="Next dress"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Craftsmanship Specifications & Atelier Narrative Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          {activeProduct.craftSpecs.map((spec, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#FAF6F0]/80 border border-[#EADCC9] shadow-xs"
            >
              <span className="text-[10px] font-sans tracking-[0.2em] uppercase text-[#2A2723]/60 block mb-1">
                {spec.label}
              </span>
              <span className="text-base font-serif font-bold text-[#2A2723] tracking-wide">
                {spec.value}
              </span>
            </div>
          ))}
        </div>

        {/* Designer Atelier Note */}
        <div className="mt-8 p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#FAF5EC] border border-[#D4AF37]/35 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <span className="text-[10px] uppercase tracking-[0.24em] font-sans text-[#D4AF37] font-bold block mb-1">
              The Creative Director's Note
            </span>
            <p className="text-sm sm:text-base font-serif italic text-[#2A2723]/90 leading-relaxed">
              "{activeProduct.story}"
            </p>
          </div>

          <div className="shrink-0">
            <span className="text-xs font-serif text-[#2A2723] font-bold block">
              Bee Queen Royal Archive
            </span>
            <span className="text-[10px] font-sans uppercase tracking-widest text-[#2A2723]/60">
              Hand-Signed Certificate Included
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

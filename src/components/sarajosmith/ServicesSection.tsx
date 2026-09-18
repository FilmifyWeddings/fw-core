'use client';

import React from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';
import { EditableImage } from '@/components/sarajosmith/admin/EditableImage';

interface ServicesSectionProps {
  onSelectService?: (serviceId: string) => void;
  onViewDetails?: () => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  onSelectService,
  onViewDetails,
}) => {
  const { config } = useSaraJoSmith();
  const { cards, storyHeading, storyBody, ctaText, collageImages } = config.services;

  return (
    <section
      id="services"
      className="relative w-full bg-[#5B5835] text-[#EFECE3] py-24 md:py-32 px-4 sm:px-6 md:px-10 overflow-hidden"
    >
      {/* Repeating Floral Wallpaper Watermark Background */}
      <div className="absolute inset-0 z-0 opacity-12 pointer-events-none mix-blend-overlay">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url(${config.assets.watermarkBg})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '400px 400px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Top 3-Column Service Cards (Matching Screenshot 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14 mb-24 md:mb-32">
          {cards.map((card, idx) => (
            <div
              key={card.id}
              onClick={() => onSelectService?.(card.id)}
              className="group cursor-pointer flex flex-col items-center text-center"
            >
              {/* White Rounded Frame Container */}
              <div className="relative w-full max-w-[280px] sm:max-w-[290px] aspect-square rounded-[22px] bg-[#EFECE3] p-2.5 shadow-xl transition-transform duration-300 group-hover:-translate-y-1.5">
                <div className="relative w-full h-full overflow-hidden rounded-[16px] bg-[#292421]/10">
                  <EditableImage
                    path={`services.cards.${idx}.image`}
                    fallbackSrc={card.image}
                    alt={card.alt}
                    label={`Service: ${card.title}`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-106"
                    sizes="(max-width: 768px) 280px, 300px"
                  />
                </div>
              </div>

              {/* Title in Elegant Script Font (White text) */}
              <div className="mt-6 mb-2">
                <EditableText
                  path={`services.cards.${idx}.title`}
                  elementKey={`service-${card.id}-script-title`}
                  fallbackText={`“ ${card.title} ”`}
                  as="h3"
                  className="font-sjs-script text-2xl sm:text-3xl text-white tracking-wide text-center"
                  defaultSizePx={28}
                />
              </div>

              {/* Subtitle in Inconsolata Typewriter (Beige/Cream text) */}
              <div className="max-w-[250px]">
                <EditableText
                  path={`services.cards.${idx}.quote`}
                  elementKey={`service-${card.id}-typewriter-quote`}
                  fallbackText={card.quote}
                  as="p"
                  className="font-sjs-body text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#EFECE3]/85 text-center leading-relaxed"
                  defaultSizePx={11}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Lower Split Section: Narrative Left & 35mm Filmstrip Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center pt-6">
          {/* Left: Headline, Heartfelt Story, Pill Button */}
          <div className="lg:col-span-5 flex flex-col items-start space-y-6">
            <h2 className="font-sjs-heading text-3xl sm:text-4xl lg:text-[44px] uppercase tracking-[0.04em] text-white leading-[1.12]">
              <EditableText
                path="services.storyHeading"
                elementKey="services-headline-olive"
                fallbackText={"DOCUMENTING\nLOVE STORIES\nFOR ALL"}
                as="span"
                multiline
                defaultSizePx={40}
              />
            </h2>

            <EditableText
              path="services.storyBody"
              elementKey="services-body-olive"
              fallbackText={storyBody}
              as="p"
              multiline
              className="font-sjs-body text-xs sm:text-sm leading-relaxed text-[#EFECE3]/85 text-justify"
              defaultSizePx={13}
            />

            {/* Pill-shaped CTA Button */}
            <button
              onClick={onViewDetails}
              className="px-8 py-3.5 rounded-full bg-[#EFECE3] hover:bg-white text-[#292421] font-sjs-body text-xs uppercase tracking-[0.2em] font-semibold transition-all duration-300 shadow-md hover:scale-102 mt-4 cursor-pointer"
            >
              <EditableText
                path="services.ctaText"
                elementKey="services-cta-pill"
                fallbackText="THE DETAILS!"
                as="span"
                defaultSizePx={12}
              />
            </button>
          </div>

          {/* Right: Authentic 35mm Filmstrip Reel with Sprockets & Frame Numbers */}
          <div className="lg:col-span-7 relative w-full overflow-hidden flex items-center justify-start lg:justify-end py-4">
            <div className="flex items-center space-x-3 overflow-x-auto sjs-scrollbar pb-2">
              {/* Film Frame 1 */}
              <div className="relative w-[210px] sm:w-[240px] md:w-[260px] aspect-[4/3] bg-[#FAF8F5] p-2 sm:p-2.5 shadow-2xl shrink-0 border border-black/40">
                {/* 35mm film header sprocket & number */}
                <div className="flex justify-between items-center px-1 pb-1 text-[8px] font-mono text-zinc-600 select-none">
                  <span>22</span>
                  <span>21A</span>
                </div>
                <div className="relative w-full h-[85%] overflow-hidden bg-zinc-900">
                  <EditableImage
                    path="services.collageImages.0.url"
                    fallbackSrc={collageImages[0].url}
                    alt={collageImages[0].alt}
                    label="Film Frame 1"
                    fill
                    className="object-cover"
                    sizes="260px"
                  />
                </div>
                {/* 35mm film footer */}
                <div className="flex justify-between items-center px-1 pt-1 text-[8px] font-mono text-zinc-600 select-none">
                  <span>21A</span>
                  <span>SAFETY FILM</span>
                </div>
              </div>

              {/* Film Frame 2 */}
              <div className="relative w-[210px] sm:w-[240px] md:w-[260px] aspect-[4/3] bg-[#FAF8F5] p-2 sm:p-2.5 shadow-2xl shrink-0 border border-black/40">
                <div className="flex justify-between items-center px-1 pb-1 text-[8px] font-mono text-zinc-600 select-none">
                  <span>23</span>
                  <span>22A</span>
                </div>
                <div className="relative w-full h-[85%] overflow-hidden bg-zinc-900">
                  <EditableImage
                    path="services.collageImages.1.url"
                    fallbackSrc={collageImages[1].url}
                    alt={collageImages[1].alt}
                    label="Film Frame 2"
                    fill
                    className="object-cover"
                    sizes="260px"
                  />
                </div>
                <div className="flex justify-between items-center px-1 pt-1 text-[8px] font-mono text-zinc-600 select-none">
                  <span>22A</span>
                  <span>KODAK 400</span>
                </div>
              </div>

              {/* Film Frame 3 */}
              <div className="relative w-[210px] sm:w-[240px] md:w-[260px] aspect-[4/3] bg-[#FAF8F5] p-2 sm:p-2.5 shadow-2xl shrink-0 border border-black/40">
                <div className="flex justify-between items-center px-1 pb-1 text-[8px] font-mono text-zinc-600 select-none">
                  <span>24</span>
                  <span>23A</span>
                </div>
                <div className="relative w-full h-[85%] overflow-hidden bg-zinc-900">
                  <EditableImage
                    path="services.collageImages.2.url"
                    fallbackSrc={collageImages[2].url}
                    alt={collageImages[2].alt}
                    label="Film Frame 3"
                    fill
                    className="object-cover"
                    sizes="260px"
                  />
                </div>
                <div className="flex justify-between items-center px-1 pt-1 text-[8px] font-mono text-zinc-600 select-none">
                  <span>23A</span>
                  <span>FILM 2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

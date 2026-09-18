'use client';

import React from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';
import { EditableImage } from '@/components/sarajosmith/admin/EditableImage';

interface MeetSectionProps {
  onBrowseWork?: () => void;
}

export const MeetSection: React.FC<MeetSectionProps> = ({ onBrowseWork }) => {
  const { config } = useSaraJoSmith();
  const { quote, label, heading, paragraphs, ctaText, mainPortrait, cameraPortrait } = config.meet;

  return (
    <section
      id="meet"
      className="relative w-full bg-[#E8E4DA] py-20 md:py-28 px-4 sm:px-6 md:px-8 border-t border-[#292421]/10 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Photographer Double Portrait & Poetic Quote */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start">
            {/* Poetic Quote Above Portrait */}
            <div className="mb-6 max-w-md text-center lg:text-left">
              <EditableText
                path="meet.quote"
                elementKey="meet-quote"
                fallbackText={quote}
                as="p"
                className="font-sjs-body italic tracking-wide text-[#292421]/75 leading-relaxed"
                defaultSizePx={14}
              />
            </div>

            {/* Double Photo Frame with Vintage Cameras */}
            <div className="relative w-full max-w-[420px] h-[360px] sm:h-[440px] flex items-center justify-center">
              {/* Main Portrait */}
              <div className="relative w-48 h-64 sm:w-64 sm:h-80 polaroid-card p-2 sm:p-3 bg-[#FAF8F5] z-10">
                <div className="relative w-full h-full overflow-hidden">
                  <EditableImage
                    path="meet.mainPortrait.url"
                    fallbackSrc={mainPortrait.url}
                    alt={mainPortrait.alt}
                    label="Meet Sara Jo Main Portrait"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 240px, 280px"
                  />
                </div>
              </div>

              {/* Overlapping Tilted Camera Portrait */}
              <div className="absolute right-4 sm:right-6 bottom-2 sm:bottom-4 z-20 rotate-4 transition-transform duration-300 hover:rotate-0 hover:scale-105">
                <div className="relative w-36 h-44 sm:w-48 sm:h-56 polaroid-card p-2 bg-[#FAF8F5] shadow-xl">
                  <div className="relative w-full h-full overflow-hidden">
                    <EditableImage
                      path="meet.cameraPortrait.url"
                      fallbackSrc={cameraPortrait.url}
                      alt={cameraPortrait.alt}
                      label="Meet Sara Jo Camera Portrait"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 160px, 200px"
                    />
                  </div>
                  {/* Decorative Frame Overlay */}
                  <div className="absolute -inset-2 pointer-events-none opacity-80">
                    <Image
                      src={config.assets.vintageStampSeals[1]}
                      alt="Vintage Frame"
                      fill
                      className="object-contain"
                      sizes="220px"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Small Label Below */}
            <div className="mt-6">
              <EditableText
                path="meet.label"
                elementKey="meet-label"
                fallbackText={label}
                as="p"
                className="font-sjs-body uppercase tracking-[0.2em] text-[#292421]/80 text-center lg:text-left"
                defaultSizePx={12}
              />
            </div>
          </div>

          {/* Right Column: Narrative Story & Browse Work CTA */}
          <div className="lg:col-span-6 flex flex-col items-start space-y-6">
            {/* Sun / Star Decorative Element */}
            <div className="relative w-12 h-12 mb-2">
              <Image
                src={config.assets.sunElement}
                alt="Brand Star"
                fill
                className="object-contain opacity-90"
                sizes="48px"
              />
            </div>

            {/* Editorial Heading */}
            <EditableText
              path="meet.heading"
              elementKey="meet-heading"
              fallbackText={heading}
              as="h2"
              className="font-sjs-heading uppercase tracking-[0.02em] text-[#292421] leading-tight"
              defaultSizePx={38}
            />

            {/* Paragraphs */}
            <div className="space-y-4 text-justify font-sjs-body text-xs sm:text-sm md:text-base leading-relaxed text-[#292421]/80 w-full">
              {paragraphs.map((p, idx) => (
                <div key={idx} className="w-full">
                  <EditableText
                    path={`meet.paragraphs.${idx}`}
                    elementKey={`meet-para-${idx}`}
                    fallbackText={p}
                    as="p"
                    multiline
                    defaultSizePx={15}
                  />
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              onClick={onBrowseWork}
              className="inline-flex items-center justify-center px-8 py-3.5 mt-4 rounded-sm border border-[#292421] font-sjs-body text-xs uppercase tracking-[0.2em] text-[#292421] hover:bg-[#292421] hover:text-white transition-all duration-300 shadow-2xs group cursor-pointer"
            >
              <EditableText
                path="meet.ctaText"
                elementKey="meet-cta-btn"
                fallbackText={ctaText}
                as="span"
                defaultSizePx={12}
              />
              <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

'use client';

import React from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';
import { EditableImage } from '@/components/sarajosmith/admin/EditableImage';

export const IntroSection: React.FC = () => {
  const { config } = useSaraJoSmith();
  const intro = config.intro;

  return (
    <section
      id="about"
      className="relative w-full bg-[#EFECE3] py-20 md:py-28 px-4 sm:px-6 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Main Collage Layout with Flanking Side Labels */}
        <div className="relative w-full flex items-center justify-between mb-12 md:mb-16">
          {/* Left Flanking Label: "AUTHENTIC CREATIONS" */}
          <div className="hidden lg:block w-44 text-right pr-6 shrink-0">
            <EditableText
              path="intro.scriptTag"
              elementKey="intro-flank-left"
              fallbackText="AUTHENTIC CREATIONS"
              as="p"
              className="font-sjs-body text-[11px] uppercase tracking-[0.25em] text-[#7B91A2] select-none"
              defaultSizePx={11}
            />
          </div>

          {/* Central Desk / Paper Scrapbook Collage */}
          <div className="relative mx-auto w-full max-w-[620px] sm:max-w-[700px] md:max-w-[780px] h-[440px] sm:h-[500px] md:h-[540px] flex items-center justify-center">
            {/* Vintage Paper Sheet Base with Paperclip & Floral Stamp */}
            <div className="absolute inset-0 z-0 drop-shadow-lg">
              <Image
                src="https://static.showit.co/1200/AOGSEwdi8fwJuprChScqfQ/298575/sara_jo_smith_website_elements13.png"
                alt="Vintage Scrapbook Paper Base"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 780px"
                priority
              />
            </div>

            {/* Handwritten Script Note at Top-Right of Paper */}
            <div className="absolute top-10 sm:top-12 md:top-14 right-10 sm:right-16 md:right-24 z-10 max-w-[220px] sm:max-w-[280px] md:max-w-[320px] text-right pointer-events-auto rotate-[0.5deg]">
              <EditableText
                path="intro.body"
                elementKey="intro-script-note"
                fallbackText="Transforming unscripted moments into timeless photographs that speaks to the heart."
                as="p"
                multiline
                className="font-sjs-script text-sm sm:text-base md:text-lg text-[#292421]/75 leading-tight italic"
                defaultSizePx={16}
              />
            </div>

            {/* Center Main Photograph: Couple on Rocks */}
            <div className="absolute left-[34%] sm:left-[35%] top-[22%] sm:top-[20%] z-10 w-[140px] sm:w-[175px] md:w-[205px] aspect-[4/5] shadow-md overflow-hidden bg-white p-1">
              <div className="relative w-full h-full overflow-hidden">
                <EditableImage
                  path="intro.mainImage.url"
                  fallbackSrc={intro.mainImage.url}
                  alt={intro.mainImage.alt}
                  label="Center Photo (Couple Sitting)"
                  fill
                  className="object-cover"
                  sizes="210px"
                  priority
                />
              </div>
            </div>

            {/* Left Polaroid: Sabrina + Jaxson (Tilted -3°) */}
            <div className="absolute left-2 sm:left-6 md:left-10 top-[22%] sm:top-[20%] z-20 -rotate-3 transition-transform duration-300 hover:rotate-0 hover:z-40">
              <div className="relative w-[140px] sm:w-[185px] md:w-[215px] aspect-[3/4] p-2 sm:p-2.5 bg-white shadow-xl">
                <div className="relative w-full h-[78%] overflow-hidden bg-[#E8E4DA]">
                  <EditableImage
                    path="intro.tiltedImages.left.url"
                    fallbackSrc={intro.tiltedImages.left.url}
                    alt={intro.tiltedImages.left.alt}
                    label="Left Polaroid Photo"
                    fill
                    className="object-cover"
                    sizes="215px"
                  />
                </div>
                {/* Vintage tape / polaroid frame overlay */}
                <div className="absolute -inset-2 pointer-events-none opacity-90">
                  <Image
                    src="https://static.showit.co/1200/BVUZ8rJkoVOwMmEjjdq1FA/298575/sara_jo_smith_website_elements6.png"
                    alt="Polaroid Frame"
                    fill
                    className="object-contain"
                    sizes="230px"
                  />
                </div>
              </div>
            </div>

            {/* Top-Right Polaroid: Hailee + Drew Cliffside (Tilted +1°) */}
            <div className="absolute right-4 sm:right-10 md:right-14 top-[24%] sm:top-[22%] z-20 rotate-1 transition-transform duration-300 hover:rotate-0 hover:z-40">
              <div className="relative w-[140px] sm:w-[185px] md:w-[215px] aspect-[4/3] p-1.5 sm:p-2 bg-white shadow-xl">
                <div className="relative w-full h-full overflow-hidden bg-[#E8E4DA]">
                  <EditableImage
                    path="intro.tiltedImages.right.url"
                    fallbackSrc={intro.tiltedImages.right.url}
                    alt={intro.tiltedImages.right.alt}
                    label="Right Polaroid Photo"
                    fill
                    className="object-cover"
                    sizes="215px"
                  />
                </div>
                {/* Vintage postal frame overlay */}
                <div className="absolute -inset-1.5 pointer-events-none opacity-90">
                  <Image
                    src="https://static.showit.co/1200/_2U14AMxnO_elf6r4ICrlw/298575/sara_jo_smith_website_elements8.png"
                    alt="Postal Frame"
                    fill
                    className="object-contain"
                    sizes="230px"
                  />
                </div>
              </div>
            </div>

            {/* Black & White Canoe Photo (Under top-right polaroid) */}
            <div className="absolute right-8 sm:right-16 md:right-22 bottom-12 sm:bottom-14 md:bottom-16 z-25 shadow-lg bg-white p-1">
              <div className="relative w-[75px] sm:w-[95px] md:w-[110px] aspect-[4/5] overflow-hidden">
                <EditableImage
                  path="intro.tiltedImages.accent.url"
                  fallbackSrc="https://static.showit.co/1200/QDYE_zObBo8nagyuDrdOYw/298575/turner-46.jpg"
                  alt="Canoe on Lake"
                  label="Canoe Black & White Photo"
                  fill
                  className="object-cover"
                  sizes="110px"
                />
              </div>
            </div>

            {/* Heart Ribbon Bow Emblem (Stamped below center) */}
            <div className="absolute left-[54%] sm:left-[53%] bottom-10 sm:bottom-12 md:bottom-14 z-30 pointer-events-none">
              <div className="relative w-12 h-14 sm:w-16 sm:h-18 opacity-85">
                <Image
                  src="https://static.showit.co/1200/gULa05MD3AomLXpKC8vVgA/298575/sara_jo_smith_brand_elements4.png"
                  alt="Heart Ribbon Bow Stamp"
                  fill
                  className="object-contain"
                  sizes="72px"
                />
              </div>
            </div>
          </div>

          {/* Right Flanking Label: "HEARTFELT HEIRLOOMS" */}
          <div className="hidden lg:block w-44 text-left pl-6 shrink-0">
            <EditableText
              path="intro.scriptTag2"
              elementKey="intro-flank-right"
              fallbackText="HEARTFELT HEIRLOOMS"
              as="p"
              className="font-sjs-body text-[11px] uppercase tracking-[0.25em] text-[#7B91A2] select-none"
              defaultSizePx={11}
            />
          </div>
        </div>

        {/* Mobile Flanking Labels Row */}
        <div className="flex lg:hidden items-center justify-between w-full max-w-sm px-4 mb-6 text-[10px] font-sjs-body uppercase tracking-[0.2em] text-[#7B91A2]">
          <span>AUTHENTIC CREATIONS</span>
          <span>HEARTFELT HEIRLOOMS</span>
        </div>

        {/* Editorial Subtitle & Main 2-Line Heading (Exact Match to Screenshot 1) */}
        <div className="text-center max-w-4xl px-4 space-y-3">
          <EditableText
            path="intro.heading"
            elementKey="intro-subtitle-tracking"
            fallbackText="DESTINATION WEDDING & ELOPEMENT PHOTOGRAPHER BASED IN GEORGIA"
            as="p"
            className="font-sjs-body text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.22em] text-[#292421]/80 text-center"
            defaultSizePx={12}
          />

          <h2 className="font-sjs-heading text-3xl sm:text-4xl md:text-5xl lg:text-[54px] uppercase tracking-[0.04em] text-[#292421] leading-[1.12] text-center font-normal">
            <EditableText
              path="intro.subheading"
              elementKey="intro-heading-main"
              fallbackText={"ARTFUL STORYTELLING\nFOR LIFE'S POETRY"}
              as="span"
              multiline
              defaultSizePx={48}
            />
          </h2>
        </div>
      </div>
    </section>
  );
};

'use client';

import React from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';
import { EditableImage } from '@/components/sarajosmith/admin/EditableImage';

interface CtaBannerProps {
  onOpenInquiry: () => void;
}

export const CtaBanner: React.FC<CtaBannerProps> = ({ onOpenInquiry }) => {
  const { config } = useSaraJoSmith();
  const { heading, buttonText, socialHandle, travelNote } = config.ctaBanner;

  return (
    <section
      id="cta"
      className="relative w-full min-h-[640px] sm:min-h-[720px] md:min-h-[820px] overflow-hidden flex items-center justify-center py-20 px-4"
    >
      {/* Full-width Panoramic B&W Background Photograph (Canoe on Lake) */}
      <div className="absolute inset-0 z-0">
        <EditableImage
          path="ctaBanner.bgImage"
          fallbackSrc="https://static.showit.co/1200/phYNF8RmQ8POd7sJMqk3tw/298575/turner-50.jpg"
          alt="Couple in Canoe on Lake"
          label="CTA Banner Lake Background"
          fill
          className="object-cover object-center filter grayscale contrast-[1.1] brightness-[0.9]"
          sizes="100vw"
          priority
        />
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />
      </div>

      {/* Centered Torn Deckled-Edge Parchment Paper Card (Exact Match to Screenshot 3) */}
      <div className="relative z-10 w-full max-w-[440px] sm:max-w-[480px] md:max-w-[530px] h-[540px] sm:h-[580px] md:h-[620px] flex items-center justify-center p-6 sm:p-10 drop-shadow-2xl">
        {/* Torn Parchment Paper Background Artwork */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://static.showit.co/1200/AqJij5xesX9tcpQcK-lVkg/298575/sara_jo_smith_website_elements11.png"
            alt="Torn Parchment Paper"
            fill
            className="object-fill"
            sizes="530px"
          />
        </div>

        {/* Content Inside the Torn Parchment Paper */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-6 px-3 sm:px-6 text-center text-[#292421]">
          {/* Top Botanical Flower Emblem */}
          <div className="relative w-10 h-14 sm:w-12 sm:h-16 opacity-90">
            <Image
              src="https://static.showit.co/1200/VWytsJHE7pF8YE5yDVanxQ/298575/sjsp_brand_element_3.png"
              alt="Botanical Flower Stem"
              fill
              className="object-contain"
              sizes="48px"
            />
          </div>

          {/* Editorial Headline */}
          <div className="my-auto max-w-[340px] sm:max-w-[380px]">
            <h2 className="font-sjs-heading text-2xl sm:text-3xl md:text-[34px] uppercase tracking-[0.03em] text-[#292421] leading-[1.25]">
              <EditableText
                path="ctaBanner.heading"
                elementKey="cta-torn-paper-headline"
                fallbackText={"LET'S PRESERVE YOUR\nSTORY IN A WAY THAT\nFEELS AS TIMELESS\nAS YOUR LOVE."}
                as="span"
                multiline
                defaultSizePx={30}
              />
            </h2>
          </div>

          {/* Oval Pill Button (Dark Charcoal with Cream Text) */}
          <button
            onClick={onOpenInquiry}
            className="px-8 sm:px-10 py-3 sm:py-3.5 rounded-full bg-[#292421] hover:bg-black text-[#EFECE3] font-sjs-body text-xs uppercase tracking-[0.25em] font-semibold transition-all duration-300 shadow-md hover:scale-105 cursor-pointer mb-6"
          >
            <EditableText
              path="ctaBanner.buttonText"
              elementKey="cta-torn-btn"
              fallbackText="GET IN TOUCH"
              as="span"
              defaultSizePx={12}
            />
          </button>

          {/* Bottom Details (Follow Along & Traveling for Love) */}
          <div className="w-full flex items-center justify-between text-[10px] sm:text-[11px] font-sjs-body uppercase tracking-[0.15em] text-[#292421]/90 pt-2 border-t border-[#292421]/15">
            <div className="text-left">
              <EditableText
                path="ctaBanner.socialHandle"
                elementKey="cta-follow-along"
                fallbackText="FOLLOW ALONG:\n@SARAJOSMITHPHOTOGRAPHY"
                as="span"
                multiline
                defaultSizePx={10}
              />
            </div>
            <div className="text-right">
              <EditableText
                path="ctaBanner.travelNote"
                elementKey="cta-travel-quote"
                fallbackText="TRAVELING FOR LOVE:\nINQUIRE FOR A QUOTE"
                as="span"
                multiline
                defaultSizePx={10}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

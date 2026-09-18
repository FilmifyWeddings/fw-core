'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';
import { EditableImage } from '@/components/sarajosmith/admin/EditableImage';

export const TestimonialSection: React.FC = () => {
  const { config } = useSaraJoSmith();
  const [currentIndex, setCurrentIndex] = useState(0);
  const testimonials = config.testimonials;
  const current = testimonials[currentIndex] || testimonials[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <section
      id="testimonials"
      className="relative w-full bg-[#EFECE3] py-20 md:py-28 px-4 sm:px-6 md:px-8 border-t border-[#292421]/10 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Top Decorative Sun Emblem */}
        <div className="flex justify-center mb-10">
          <div className="relative w-14 h-14 opacity-80">
            <Image
              src="https://static.showit.co/1200/95gXSZZk0wxzXdbpNycRBw/298575/sjsp_brand_elements.png"
              alt="Testimonial Emblem"
              fill
              className="object-contain"
              sizes="56px"
            />
          </div>
        </div>

        {/* 3-Part Grid: Left Photo, Center Quote, Right Photo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Couple Portrait */}
          <div className="lg:col-span-3 hidden lg:flex flex-col items-center">
            <div className="relative w-56 h-68 polaroid-card p-2 bg-[#FAF8F5]">
              <div className="relative w-full h-full overflow-hidden">
                <EditableImage
                  path={`testimonials.${currentIndex}.leftImage.url`}
                  fallbackSrc={current.leftImage.url}
                  alt={current.leftImage.caption}
                  label={`Testimonial ${current.author} Left Photo`}
                  fill
                  className="object-cover"
                  sizes="224px"
                />
              </div>
            </div>
            <p className="font-sjs-body text-[11px] uppercase tracking-[0.15em] text-[#292421]/60 mt-4 text-center">
              {current.leftImage.caption}
            </p>
          </div>

          {/* Center Editorial Praise Quote */}
          <div className="lg:col-span-6 flex flex-col items-center text-center px-4 md:px-8 space-y-6">
            <EditableText
              path={`testimonials.${currentIndex}.quote`}
              elementKey={`testimonial-${current.id}-quote`}
              fallbackText={current.quote}
              as="h3"
              className="font-sjs-heading uppercase tracking-[0.02em] text-[#292421] leading-snug text-center"
              defaultSizePx={34}
            />

            <EditableText
              path={`testimonials.${currentIndex}.content`}
              elementKey={`testimonial-${current.id}-content`}
              fallbackText={current.content}
              as="p"
              multiline
              className="font-sjs-body leading-relaxed text-[#292421]/80 max-w-xl text-justify sm:text-center"
              defaultSizePx={15}
            />

            <div className="pt-2">
              <EditableText
                path={`testimonials.${currentIndex}.author`}
                elementKey={`testimonial-${current.id}-author`}
                fallbackText={current.author}
                as="span"
                className="font-sjs-heading uppercase tracking-widest text-[#292421] font-medium"
                defaultSizePx={22}
              />
            </div>

            {/* Navigation Dots / Arrows */}
            <div className="flex items-center space-x-6 pt-4">
              <button
                onClick={handlePrev}
                className="w-9 h-9 rounded-full border border-[#292421]/30 flex items-center justify-center text-[#292421] hover:bg-[#292421] hover:text-white transition-colors cursor-pointer"
                aria-label="Previous testimonial"
              >
                ←
              </button>
              <div className="flex space-x-2">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentIndex ? 'w-6 bg-[#292421]' : 'w-2 bg-[#292421]/30'
                    }`}
                    aria-label={`Go to review ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className="w-9 h-9 rounded-full border border-[#292421]/30 flex items-center justify-center text-[#292421] hover:bg-[#292421] hover:text-white transition-colors cursor-pointer"
                aria-label="Next testimonial"
              >
                →
              </button>
            </div>
          </div>

          {/* Right Couple Portrait */}
          <div className="lg:col-span-3 hidden lg:flex flex-col items-center">
            <div className="relative w-56 h-68 polaroid-card p-2 bg-[#FAF8F5]">
              <div className="relative w-full h-full overflow-hidden">
                <EditableImage
                  path={`testimonials.${currentIndex}.rightImage.url`}
                  fallbackSrc={current.rightImage.url}
                  alt={current.rightImage.caption}
                  label={`Testimonial ${current.author} Right Photo`}
                  fill
                  className="object-cover"
                  sizes="224px"
                />
              </div>
            </div>
            <p className="font-sjs-body text-[11px] uppercase tracking-[0.15em] text-[#292421]/60 mt-4 text-center">
              {current.rightImage.caption}
            </p>
          </div>
        </div>

        {/* Mobile Portraits Row below on small screens */}
        <div className="grid grid-cols-2 gap-4 mt-10 lg:hidden max-w-sm mx-auto">
          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-[4/5] polaroid-card p-1.5 bg-[#FAF8F5]">
              <div className="relative w-full h-full overflow-hidden">
                <EditableImage
                  path={`testimonials.${currentIndex}.leftImage.url`}
                  fallbackSrc={current.leftImage.url}
                  alt={current.leftImage.caption}
                  label="Testimonial Left Photo"
                  fill
                  className="object-cover"
                  sizes="180px"
                />
              </div>
            </div>
            <p className="font-sjs-body text-[10px] uppercase tracking-wider text-[#292421]/60 mt-2 text-center">
              {current.leftImage.caption}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative w-full aspect-[4/5] polaroid-card p-1.5 bg-[#FAF8F5]">
              <div className="relative w-full h-full overflow-hidden">
                <EditableImage
                  path={`testimonials.${currentIndex}.rightImage.url`}
                  fallbackSrc={current.rightImage.url}
                  alt={current.rightImage.caption}
                  label="Testimonial Right Photo"
                  fill
                  className="object-cover"
                  sizes="180px"
                />
              </div>
            </div>
            <p className="font-sjs-body text-[10px] uppercase tracking-wider text-[#292421]/60 mt-2 text-center">
              {current.rightImage.caption}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

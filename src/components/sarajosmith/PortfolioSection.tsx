'use client';

import React, { useState } from 'react';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { PortfolioItem } from '@/data/saraJoSmithConfig';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';
import { EditableImage } from '@/components/sarajosmith/admin/EditableImage';

interface PortfolioSectionProps {
  onOpenLightbox: (item: PortfolioItem) => void;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  onOpenLightbox,
}) => {
  const { config } = useSaraJoSmith();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'weddings' | 'elopements' | 'portraits'>('all');
  const { heading, subheading, items } = config.portfolio;

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((item) => item.category === selectedCategory);

  const categories: { label: string; value: 'all' | 'weddings' | 'elopements' | 'portraits' }[] = [
    { label: 'all stories', value: 'all' },
    { label: 'weddings', value: 'weddings' },
    { label: 'elopements', value: 'elopements' },
    { label: 'portraits & fam', value: 'portraits' },
  ];

  return (
    <section
      id="portfolio"
      className="relative w-full bg-[#EFECE3] py-20 md:py-28 px-4 sm:px-6 md:px-8 border-t border-[#292421]/10 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <EditableText
            path="portfolio.subheading"
            elementKey="portfolio-subheading"
            fallbackText={subheading}
            as="p"
            className="font-sjs-body uppercase tracking-[0.2em] text-[#292421]/75 text-center"
            defaultSizePx={13}
          />

          <EditableText
            path="portfolio.heading"
            elementKey="portfolio-heading"
            fallbackText={heading}
            as="h2"
            className="font-sjs-heading uppercase tracking-[0.02em] text-[#292421] leading-tight text-center"
            defaultSizePx={40}
          />
          <div className="w-16 h-[1px] bg-[#292421]/30 mx-auto mt-4" />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-14">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`font-sjs-body text-xs sm:text-sm uppercase tracking-[0.18em] px-4 py-1.5 transition-all duration-300 relative cursor-pointer ${
                selectedCategory === cat.value
                  ? 'text-[#292421] font-semibold'
                  : 'text-[#292421]/60 hover:text-[#292421]'
              }`}
            >
              {cat.label}
              {selectedCategory === cat.value && (
                <span className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-[#292421]" />
              )}
            </button>
          ))}
        </div>

        {/* Editorial Photo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => onOpenLightbox(item)}
              className="group cursor-pointer relative overflow-hidden rounded-2xs border border-[#292421]/15 bg-[#FAF8F5] p-2 sm:p-2.5 polaroid-card"
            >
              {/* Photo Container */}
              <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#E8E4DA]">
                <EditableImage
                  path={`portfolio.items.${idx}.image`}
                  fallbackSrc={item.image}
                  alt={item.title}
                  label={`Portfolio: ${item.title}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-106"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />

                {/* Dark Vignette Overlay on Hover */}
                <div className="absolute inset-0 bg-[#292421]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 text-white pointer-events-none">
                  <span className="font-sjs-body text-[10px] uppercase tracking-[0.2em] text-[#C6B495] mb-1">
                    {item.location || item.category}
                  </span>
                  <h4 className="font-sjs-heading text-2xl uppercase tracking-wide text-white">
                    {item.title}
                  </h4>
                  {item.caption && (
                    <p className="font-sjs-body text-xs text-white/80 mt-1 italic line-clamp-2">
                      {item.caption}
                    </p>
                  )}
                  <div className="mt-3 flex items-center space-x-2 text-xs uppercase tracking-widest text-[#FAF8F5]">
                    <span>view photograph</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Bottom Caption bar (Editable Title) */}
              <div className="pt-3 pb-1 px-1 flex items-center justify-between">
                <EditableText
                  path={`portfolio.items.${idx}.title`}
                  elementKey={`port-${item.id}-title`}
                  fallbackText={item.title}
                  as="h4"
                  className="font-sjs-heading uppercase tracking-wide text-[#292421]"
                  defaultSizePx={18}
                />
                <span className="font-sjs-body text-[10px] uppercase tracking-[0.15em] text-[#292421]/60">
                  {item.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

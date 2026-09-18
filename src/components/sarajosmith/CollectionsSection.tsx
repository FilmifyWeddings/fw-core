'use client';

import React from 'react';
import { useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { PricingPackage } from '@/data/saraJoSmithConfig';
import { EditableText } from '@/components/sarajosmith/admin/EditableText';
import { EditableImage } from '@/components/sarajosmith/admin/EditableImage';

interface CollectionsSectionProps {
  onSelectPackage?: (pkg: PricingPackage) => void;
}

export const CollectionsSection: React.FC<CollectionsSectionProps> = ({
  onSelectPackage,
}) => {
  const { config } = useSaraJoSmith();
  const { heading, subheading, packages } = config.collections;

  return (
    <section
      id="collections"
      className="relative w-full bg-[#EFECE3] py-20 md:py-28 px-4 sm:px-6 md:px-8 border-t border-[#292421]/10 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-3">
          <EditableText
            path="collections.subheading"
            elementKey="collections-subheading"
            fallbackText={subheading}
            as="p"
            className="font-sjs-body uppercase tracking-[0.2em] text-[#292421]/75 text-center"
            defaultSizePx={13}
          />

          <EditableText
            path="collections.heading"
            elementKey="collections-heading"
            fallbackText={heading}
            as="h2"
            className="font-sjs-heading uppercase tracking-[0.02em] text-[#292421] leading-tight text-center"
            defaultSizePx={40}
          />
          <div className="w-16 h-[1px] bg-[#292421]/30 mx-auto mt-4" />
        </div>

        {/* 3 Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 lg:gap-10">
          {packages.map((pkg, idx) => (
            <div
              key={pkg.id}
              className={`relative flex flex-col justify-between p-6 sm:p-8 rounded-sm bg-[#FAF8F5] border transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md ${
                pkg.badge === 'Most Cherished'
                  ? 'border-[#292421]/40 ring-1 ring-[#292421]/20'
                  : 'border-[#292421]/15'
              }`}
            >
              {/* Badge if featured */}
              {pkg.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#292421] text-white px-3.5 py-0.5 rounded-full">
                  <span className="font-sjs-body text-[10px] uppercase tracking-[0.18em] font-medium">
                    {pkg.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Package Thumbnail Image (Editable) */}
                {pkg.image && (
                  <div className="relative w-full h-44 mb-6 overflow-hidden rounded-2xs border border-[#292421]/10">
                    <EditableImage
                      path={`collections.packages.${idx}.image`}
                      fallbackSrc={pkg.image}
                      alt={pkg.title}
                      label={`Package ${pkg.title} Thumbnail`}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  </div>
                )}

                {/* Title and Subtitle */}
                <EditableText
                  path={`collections.packages.${idx}.title`}
                  elementKey={`pkg-${pkg.id}-title`}
                  fallbackText={pkg.title}
                  as="h3"
                  className="font-sjs-heading uppercase tracking-wide text-[#292421]"
                  defaultSizePx={26}
                />

                <EditableText
                  path={`collections.packages.${idx}.subtitle`}
                  elementKey={`pkg-${pkg.id}-subtitle`}
                  fallbackText={pkg.subtitle}
                  as="p"
                  className="font-sjs-body text-xs text-[#292421]/70 italic mt-1 mb-4"
                  defaultSizePx={12}
                />

                {/* Investment Price */}
                <div className="py-2.5 border-y border-[#292421]/15 mb-6">
                  <EditableText
                    path={`collections.packages.${idx}.investment`}
                    elementKey={`pkg-${pkg.id}-investment`}
                    fallbackText={pkg.investment}
                    as="span"
                    className="font-sjs-body uppercase tracking-[0.15em] font-semibold text-[#292421]"
                    defaultSizePx={15}
                  />
                </div>

                {/* Description */}
                <div className="mb-6">
                  <EditableText
                    path={`collections.packages.${idx}.description`}
                    elementKey={`pkg-${pkg.id}-desc`}
                    fallbackText={pkg.description}
                    as="p"
                    multiline
                    className="font-sjs-body text-xs leading-relaxed text-[#292421]/80"
                    defaultSizePx={13}
                  />
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start space-x-2.5">
                      <span className="text-[#5B5835] text-xs mt-0.5 shrink-0">✦</span>
                      <span className="font-sjs-body text-xs text-[#292421]/80 leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Package CTA Button */}
              <button
                onClick={() => onSelectPackage?.(pkg)}
                className={`w-full py-3.5 px-4 rounded-xs font-sjs-body text-xs uppercase tracking-[0.2em] transition-all duration-300 text-center cursor-pointer ${
                  pkg.badge === 'Most Cherished'
                    ? 'bg-[#292421] text-white hover:bg-black'
                    : 'border border-[#292421] text-[#292421] hover:bg-[#292421] hover:text-white'
                }`}
              >
                {pkg.ctaText}
              </button>
            </div>
          ))}
        </div>

        {/* Travel Note & Custom Quote Info */}
        <div className="text-center mt-12 pt-8 border-t border-[#292421]/15">
          <p className="font-sjs-body text-xs text-[#292421]/70 tracking-wide">
            Need custom hours, multi-day coverage, or rehearsals added?{' '}
            <button
              onClick={() => onSelectPackage?.(packages[1])}
              className="underline hover:text-[#292421] font-semibold cursor-pointer"
            >
              Inquire for a bespoke collection tailored to your day
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};

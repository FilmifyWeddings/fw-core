'use client';

import React from 'react';
import UnifiedPricingCatalog from '@/components/pricing/UnifiedPricingCatalog';

export interface PricingCardsGridProps {
  isYearly?: boolean;
}

export const PricingCardsGrid: React.FC<PricingCardsGridProps> = () => {
  return (
    <div className="w-full mb-12 select-none">
      <UnifiedPricingCatalog
        variant="landing"
        defaultTab="gallery"
        onStartTrial={(plan) => {
          window.location.href = `/login?plan=${encodeURIComponent(plan.id)}`;
        }}
      />
    </div>
  );
};

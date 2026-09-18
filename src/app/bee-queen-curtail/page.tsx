'use client';

import React, { useState } from 'react';
import { CurrencyProvider } from '@/components/bee-queen-curtail/CurrencyContext';
import { Navbar } from '@/components/bee-queen-curtail/Navbar';
import { HeroSection } from '@/components/bee-queen-curtail/HeroSection';
import { RunwayCarousel } from '@/components/bee-queen-curtail/RunwayCarousel';
import { AtelierSection } from '@/components/bee-queen-curtail/AtelierSection';
import { VirtualFittingRoom } from '@/components/bee-queen-curtail/VirtualFittingRoom';
import { HeritageSection } from '@/components/bee-queen-curtail/HeritageSection';
import { VIPServicesSection } from '@/components/bee-queen-curtail/VIPServicesSection';
import { VIPBookingModal } from '@/components/bee-queen-curtail/VIPBookingModal';
import { FooterSection } from '@/components/bee-queen-curtail/FooterSection';
import { ProductData } from '@/components/bee-queen-curtail/DressViewer3D';
import { soundCtrl } from '@/components/bee-queen-curtail/SoundController';

export default function BeeQueenCurtailPage() {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('Bridal Bespoke Consultation');
  const [customizationSummary, setCustomizationSummary] = useState('');

  const handleOpenBooking = (serviceName?: string, customDetails?: string) => {
    if (serviceName) setSelectedService(serviceName);
    if (customDetails) setCustomizationSummary(customDetails);
    setBookingModalOpen(true);
  };

  const handleInquireProduct = (product: ProductData) => {
    handleOpenBooking(
      'Bridal Bespoke Consultation',
      `Product Inquiry: ${product.name} (${product.category}) - ${product.tagline}`
    );
  };

  const handleVirtualFittingBook = (summary: string) => {
    handleOpenBooking('Virtual Stylist Session', `Custom 3D Silhouette Configuration: ${summary}`);
  };

  const scrollToRunway = () => {
    const el = document.getElementById('runway');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <CurrencyProvider>
      <div className="relative min-h-screen bg-[#FBF8F3] text-[#2A2723] overflow-x-hidden font-sans selection:bg-[#D4AF37]/25 selection:text-[#2A2723]">
        
        {/* Floating Luxury Navigation */}
        <Navbar onOpenBooking={() => handleOpenBooking('Bridal Bespoke Consultation')} />

        <main className="w-full">
          {/* Section 1: Hero Section (The Royal Entrance) */}
          <HeroSection onExploreClick={scrollToRunway} />

          {/* Section 2: Interactive 3D Runway Carousel (Couture Showcase) */}
          <RunwayCarousel onInquireProduct={handleInquireProduct} />

          {/* Section 3: The Atelier & Real Model Editorial Grid */}
          <AtelierSection />

          {/* Section 4: Virtual Dressing Room (Interactive 3D Fitting Feature) */}
          <VirtualFittingRoom onBookFitting={handleVirtualFittingBook} />

          {/* Section 5: Brand Story & Heritage (The Philosophy) */}
          <HeritageSection />

          {/* Section 6: Curated Services & VIP Appointments */}
          <VIPServicesSection onSelectService={(s) => handleOpenBooking(s)} />
        </main>

        {/* Section 7: Modern Minimal Luxury Footer */}
        <FooterSection onOpenBooking={() => handleOpenBooking('Bridal Bespoke Consultation')} />

        {/* VIP Appointment / Bespoke Inscription Modal */}
        <VIPBookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          defaultService={selectedService}
          customizationDetails={customizationSummary}
        />
      </div>
    </CurrencyProvider>
  );
}

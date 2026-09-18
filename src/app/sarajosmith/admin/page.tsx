'use client';

import React, { useState, useEffect } from 'react';
import '@/styles/sarajosmith.css';
import { SaraJoSmithProvider, useSaraJoSmith } from '@/context/SaraJoSmithContext';
import { AdminTopBar } from '@/components/sarajosmith/admin/AdminTopBar';
import { AdminSidebar } from '@/components/sarajosmith/admin/AdminSidebar';
import { DeviceSimulatorFrame } from '@/components/sarajosmith/admin/DeviceSimulatorFrame';
import { ImageReplaceModal } from '@/components/sarajosmith/admin/ImageReplaceModal';
import { HeaderNav } from '@/components/sarajosmith/HeaderNav';
import { NavigationDrawer } from '@/components/sarajosmith/NavigationDrawer';
import { HeroSection } from '@/components/sarajosmith/HeroSection';
import { IntroSection } from '@/components/sarajosmith/IntroSection';
import { ServicesSection } from '@/components/sarajosmith/ServicesSection';
import { MeetSection } from '@/components/sarajosmith/MeetSection';
import { CollectionsSection } from '@/components/sarajosmith/CollectionsSection';
import { PortfolioSection } from '@/components/sarajosmith/PortfolioSection';
import { TestimonialSection } from '@/components/sarajosmith/TestimonialSection';
import { CtaBanner } from '@/components/sarajosmith/CtaBanner';
import { InstagramFeed } from '@/components/sarajosmith/InstagramFeed';
import { FooterSection } from '@/components/sarajosmith/FooterSection';
import { InquiryModal } from '@/components/sarajosmith/InquiryModal';
import { LightboxModal } from '@/components/sarajosmith/LightboxModal';
import { PortfolioItem, PricingPackage } from '@/data/saraJoSmithConfig';

function AdminContent() {
  const { config, isSidebarOpen } = useSaraJoSmith();
  const [activeSection, setActiveSection] = useState('hero');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);
  const [lightboxItem, setLightboxItem] = useState<PortfolioItem | null>(null);

  // Smooth scroll to targeted sections
  const handleNavigate = (targetId: string) => {
    const cleanId = targetId.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (cleanId === 'contact') {
      setSelectedPackage(null);
      setIsInquiryOpen(true);
      return;
    }

    if (cleanId === 'collections') {
      const el = document.getElementById('collections');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        setActiveSection('collections');
        return;
      }
    }

    if (cleanId === 'portfolio') {
      const el = document.getElementById('portfolio');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        setActiveSection('portfolio');
        return;
      }
    }

    if (cleanId === 'home' || cleanId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSection('hero');
      return;
    }

    const element = document.getElementById(cleanId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(cleanId);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'about', 'services', 'meet', 'collections', 'portfolio', 'testimonials', 'cta'];
      const scrollPos = window.scrollY + 200;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#121110] text-[#292421] selection:bg-[#C6B495]/40 selection:text-[#292421]">
      {/* Left Visual Studio Editor Sidebar Dock */}
      <AdminSidebar />

      {/* Main Studio Area (automatically offsets when sidebar is open) */}
      <div className={`transition-all duration-300 min-h-screen flex flex-col ${isSidebarOpen ? 'lg:pl-[360px]' : 'pl-0'}`}>
        {/* Sticky Top Admin Toolbar */}
        <AdminTopBar />

        {/* Responsive Device Viewport Simulator Frame (Desktop, Tablet 768px, Mobile 375px) */}
        <DeviceSimulatorFrame>
          <div className="min-h-screen w-full sjs-container font-sjs-body text-[#292421] bg-[#EFECE3] relative [transform:translate3d(0,0,0)]">
            {/* Top Navigation & Stamp Menu Trigger */}
            <HeaderNav
              activeSection={activeSection}
              onOpenMenu={() => setIsMenuOpen(true)}
              onNavigate={handleNavigate}
            />

            {/* Slide-in Full Navigation Drawer */}
            <NavigationDrawer
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              onNavigate={handleNavigate}
            />

            <main className="w-full">
              {/* 1. Hero Section with 5-photo rotating cross-fade gallery */}
              <HeroSection onNavigate={handleNavigate} />

              {/* 2. Intro / About Us Collage Section */}
              <IntroSection />

              {/* 3. Services / Offerings 3-Column Arched Overview & Story */}
              <ServicesSection
                onSelectService={() => handleNavigate('collections')}
                onViewDetails={() => handleNavigate('collections')}
              />

              {/* 4. Meet Sara Jo Double Portrait & Bio Section */}
              <MeetSection onBrowseWork={() => handleNavigate('portfolio')} />

              {/* 5. Wedding & Elopement Collections / Package Tiers */}
              <CollectionsSection onSelectPackage={(pkg) => {
                setSelectedPackage(pkg);
                setIsInquiryOpen(true);
              }} />

              {/* 6. Portfolio / Art Collections with Filter Tabs & Lightbox Trigger */}
              <PortfolioSection onOpenLightbox={(item) => setLightboxItem(item)} />

              {/* 7. Client Testimonial & Praise Slider */}
              <TestimonialSection />

              {/* 8. Call To Action Banner with Parchment Texture */}
              <CtaBanner onOpenInquiry={() => {
                setSelectedPackage(null);
                setIsInquiryOpen(true);
              }} />

              {/* 9. Live Instagram / Recent Stories Marquee Grid */}
              <InstagramFeed />
            </main>

            {/* 10. Luxury Footer */}
            <FooterSection onNavigate={handleNavigate} />
          </div>
        </DeviceSimulatorFrame>
      </div>

      {/* Interactive Contact / Inquiry Drawer Modal */}
      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        preselectedPackage={selectedPackage}
      />

      {/* Interactive Photography Lightbox Modal */}
      <LightboxModal
        item={lightboxItem}
        items={config.portfolio.items}
        onClose={() => setLightboxItem(null)}
        onNavigate={(item) => setLightboxItem(item)}
      />

      {/* Admin Image Replacement Modal */}
      <ImageReplaceModal />
    </div>
  );
}

export default function SaraJoSmithAdminPage() {
  return (
    <SaraJoSmithProvider isAdmin={true}>
      <AdminContent />
    </SaraJoSmithProvider>
  );
}

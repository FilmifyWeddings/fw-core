'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSaraJoSmith, DeviceType } from '@/context/SaraJoSmithContext';

export const AdminSidebar: React.FC = () => {
  const {
    config,
    isSidebarOpen,
    setIsSidebarOpen,
    activeDeviceView,
    setActiveDeviceView,
    targetEditDevice,
    setTargetEditDevice,
    selectedElement,
    setSelectedElement,
    fontSizeOverrides,
    updateText,
    updateFontSize,
    getEffectiveFontSize,
    customLinks,
    updateLink,
    saveConfig,
    resetToDefaults,
    isSavedToastVisible,
    setActiveImageEdit,
  } = useSaraJoSmith();

  const [activeTab, setActiveTab] = useState<'inspector' | 'sections' | 'links' | 'photos'>('inspector');

  const currentSize = selectedElement
    ? (targetEditDevice === 'all'
        ? (fontSizeOverrides[selectedElement.elementKey]?.all ?? selectedElement.defaultSizePx ?? 16)
        : (fontSizeOverrides[selectedElement.elementKey]?.[targetEditDevice] ?? fontSizeOverrides[selectedElement.elementKey]?.all ?? selectedElement.defaultSizePx ?? 16))
    : 16;

  return (
    <>
      {/* Collapsed Toggle Button when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-14 z-50 bg-[#1E1B18]/95 text-amber-400 border border-amber-600/40 px-3.5 py-2 rounded-md shadow-2xl font-sjs-body text-xs uppercase tracking-wider flex items-center space-x-2 hover:bg-black transition-all cursor-pointer backdrop-blur-md"
        >
          <span>⚙️</span>
          <span>Open Studio Editor</span>
        </button>
      )}

      {/* Main Studio Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#1A1816] text-[#EFECE3] border-r border-amber-600/30 shadow-2xl flex flex-col transition-all duration-300 ${
          !isSidebarOpen ? '-translate-x-full w-0 pointer-events-none' : 'translate-x-0 w-[340px] sm:w-[360px]'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/30">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="font-sjs-heading text-lg tracking-wider text-amber-300 uppercase font-bold">
              Visual Studio Editor
            </h2>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-zinc-400 hover:text-white text-sm cursor-pointer"
            title="Collapse Sidebar"
          >
            ◀
          </button>
        </div>

        {/* 1. Device Viewport Simulator Switcher */}
        <div className="p-3.5 border-b border-white/10 bg-zinc-900/60 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-sjs-body text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">
              Device Viewport Mode:
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
              {activeDeviceView}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 rounded-md border border-white/10">
            <button
              onClick={() => setActiveDeviceView('all')}
              className={`py-1.5 px-2 rounded-xs text-[10px] font-sjs-body uppercase tracking-wider transition-colors cursor-pointer ${
                activeDeviceView === 'all' ? 'bg-amber-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Full responsive auto width"
            >
              All (Auto)
            </button>
            <button
              onClick={() => setActiveDeviceView('desktop')}
              className={`py-1.5 px-2 rounded-xs text-[10px] font-sjs-body uppercase tracking-wider transition-colors cursor-pointer ${
                activeDeviceView === 'desktop' ? 'bg-amber-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Desktop 100% full width"
            >
              💻 Desk
            </button>
            <button
              onClick={() => setActiveDeviceView('tablet')}
              className={`py-1.5 px-2 rounded-xs text-[10px] font-sjs-body uppercase tracking-wider transition-colors cursor-pointer ${
                activeDeviceView === 'tablet' ? 'bg-amber-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Simulate Tablet 768px"
            >
              📱 Tab
            </button>
            <button
              onClick={() => setActiveDeviceView('mobile')}
              className={`py-1.5 px-2 rounded-xs text-[10px] font-sjs-body uppercase tracking-wider transition-colors cursor-pointer ${
                activeDeviceView === 'mobile' ? 'bg-amber-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
              title="Simulate iPhone 375px"
            >
              📱 Mob
            </button>
          </div>

          {/* Device-Specific Font Sizing Targeting Rule */}
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-300 font-sjs-body">
            <span>Font Changes Apply To:</span>
            <select
              value={targetEditDevice}
              onChange={(e) => setTargetEditDevice(e.target.value as DeviceType)}
              className="bg-black/70 border border-amber-600/40 text-amber-300 rounded-xs px-2 py-0.5 text-[10px] font-sjs-body focus:outline-none cursor-pointer"
            >
              <option value="all">🌐 All Devices</option>
              <option value="desktop">💻 Desktop Only</option>
              <option value="tablet">📱 Tablet Only</option>
              <option value="mobile">📱 Mobile Only</option>
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 shrink-0 text-[11px] font-sjs-body uppercase tracking-wider bg-black/20">
          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
              activeTab === 'inspector' ? 'border-b-2 border-amber-500 text-amber-400 font-bold bg-white/5' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Inspect
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
              activeTab === 'sections' ? 'border-b-2 border-amber-500 text-amber-400 font-bold bg-white/5' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sections
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
              activeTab === 'photos' ? 'border-b-2 border-amber-500 text-amber-400 font-bold bg-white/5' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Photos
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
              activeTab === 'links' ? 'border-b-2 border-amber-500 text-amber-400 font-bold bg-white/5' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Links
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 sjs-scrollbar">
          {/* TAB 1: INSPECTOR (Selected Element) */}
          {activeTab === 'inspector' && (
            <div>
              {selectedElement ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="font-sjs-body text-xs font-bold text-amber-400 uppercase tracking-wide">
                      {selectedElement.label || 'Selected Text'}
                    </span>
                    <button
                      onClick={() => setSelectedElement(null)}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Deselect
                    </button>
                  </div>

                  {/* Text Editor */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                      Text Content:
                    </label>
                    {selectedElement.multiline ? (
                      <textarea
                        rows={4}
                        value={selectedElement.text}
                        onChange={(e) => updateText(selectedElement.path, e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xs p-2 text-xs font-sjs-body text-white focus:outline-none focus:border-amber-500 resize-y"
                      />
                    ) : (
                      <input
                        type="text"
                        value={selectedElement.text}
                        onChange={(e) => updateText(selectedElement.path, e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xs px-2.5 py-1.5 text-xs font-sjs-body text-white focus:outline-none focus:border-amber-500"
                      />
                    )}
                  </div>

                  {/* Font Size Adjuster with Device Target */}
                  <div className="bg-black/40 p-3 rounded-xs border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-300 font-semibold">
                        Font Size ({targetEditDevice.toUpperCase()}):
                      </span>
                      <span className="text-xs font-bold font-mono text-amber-400">
                        {currentSize}px
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => updateFontSize(selectedElement.elementKey, Math.max(9, currentSize - 1))}
                        className="w-8 h-8 rounded-xs bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={10}
                        max={72}
                        value={currentSize}
                        onChange={(e) => updateFontSize(selectedElement.elementKey, Number(e.target.value))}
                        className="flex-1 accent-amber-500 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => updateFontSize(selectedElement.elementKey, Math.min(96, currentSize + 1))}
                        className="w-8 h-8 rounded-xs bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-[9px] text-zinc-400 mt-2 italic">
                      Tip: Target is set to <strong>{targetEditDevice}</strong>. Font size changes will affect {targetEditDevice === 'all' ? 'all devices' : `only ${targetEditDevice}`}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 px-2 space-y-3">
                  <span className="text-3xl">👆</span>
                  <p className="text-xs font-sjs-body text-zinc-300 font-semibold">
                    Click any element on the page to inspect and edit!
                  </p>
                  <p className="text-[11px] font-sjs-body text-zinc-500">
                    Click any heading, subheading, body paragraph, or button to adjust its text and responsive font size.
                  </p>
                </div>
              )}

              {/* Quick Image Upload Button in Inspector */}
              <div className="pt-4 border-t border-white/10 mt-6">
                <button
                  onClick={() => setActiveImageEdit({
                    path: 'hero.slides.0.url',
                    currentUrl: config.hero.slides[0]?.url || '',
                    label: 'Hero Main Photograph',
                  })}
                  className="w-full py-2.5 px-3 bg-amber-900/60 hover:bg-amber-800 border border-amber-600/50 text-white rounded-xs text-xs font-sjs-body uppercase tracking-wider font-semibold flex items-center justify-center space-x-2 cursor-pointer transition-colors shadow-sm"
                >
                  <span>📷</span>
                  <span>Upload & Replace Photos</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SECTIONS JUMP & EDIT */}
          {activeTab === 'sections' && (
            <div className="space-y-2 font-sjs-body text-xs">
              <span className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-2 font-semibold">
                Jump & Edit Section:
              </span>
              {[
                { id: 'hero', name: '1. Hero Slideshow' },
                { id: 'about', name: '2. Intro Scrapbook Collage' },
                { id: 'services', name: '3. The Services (Olive Green)' },
                { id: 'meet', name: '4. Meet Sara Jo Bio' },
                { id: 'collections', name: '5. Collections & Pricing' },
                { id: 'portfolio', name: '6. Portfolio Art Galleries' },
                { id: 'testimonials', name: '7. Client Praise & Reviews' },
                { id: 'cta', name: '8. CTA Banner (Torn Parchment)' },
                { id: 'instagram', name: '9. Instagram Feed' },
              ].map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => {
                    const el = document.getElementById(sec.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-left py-2 px-3 bg-black/40 hover:bg-white/10 rounded-xs border border-white/5 text-zinc-200 hover:text-white transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>{sec.name}</span>
                  <span className="text-zinc-500">→</span>
                </button>
              ))}
            </div>
          )}

          {/* TAB 3: LINKS & URLS MANAGER */}
          {activeTab === 'links' && (
            <div className="space-y-4 font-sjs-body text-xs">
              <span className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                Customize Website Links:
              </span>

              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Collections Link:</label>
                <input
                  type="text"
                  value={customLinks['nav.collections'] || '#collections'}
                  onChange={(e) => updateLink('nav.collections', e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xs px-2 py-1 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Portfolio Link:</label>
                <input
                  type="text"
                  value={customLinks['nav.portfolio'] || '#portfolio'}
                  onChange={(e) => updateLink('nav.portfolio', e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xs px-2 py-1 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Instagram Profile URL:</label>
                <input
                  type="text"
                  value={customLinks['social.instagram'] || 'https://instagram.com/sarajosmithphotography'}
                  onChange={(e) => updateLink('social.instagram', e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xs px-2 py-1 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Inquiry Email:</label>
                <input
                  type="text"
                  value={customLinks['contact.email'] || 'mailto:sarajosmithphotography@gmail.com'}
                  onChange={(e) => updateLink('contact.email', e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xs px-2 py-1 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 4: PHOTOS MANAGER */}
          {activeTab === 'photos' && (
            <div className="space-y-3 font-sjs-body text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Replace Website Photos:
                </span>
                <span className="text-[10px] text-amber-400 font-bold">1-Click Upload</span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    label: 'Hero Slide 1 (Twilight)',
                    path: 'hero.slides.0.url',
                    url: config.hero.slides[0]?.url,
                  },
                  {
                    label: 'Hero Slide 2 (Embrace)',
                    path: 'hero.slides.1.url',
                    url: config.hero.slides[1]?.url,
                  },
                  {
                    label: 'Intro Canoe Collage',
                    path: 'intro.mainImage.url',
                    url: config.intro.mainImage?.url,
                  },
                  {
                    label: 'Intro Polaroid Left',
                    path: 'intro.tiltedImages.left.url',
                    url: config.intro.tiltedImages.left?.url,
                  },
                  {
                    label: 'Intro Polaroid Right',
                    path: 'intro.tiltedImages.right.url',
                    url: config.intro.tiltedImages.right?.url,
                  },
                  {
                    label: 'Intro Accent Photo',
                    path: 'intro.tiltedImages.accent.url',
                    url: config.intro.tiltedImages.accent?.url,
                  },
                  {
                    label: 'The Services Card 1',
                    path: 'services.cards.0.image',
                    url: config.services.cards[0]?.image,
                  },
                  {
                    label: 'The Services Card 2',
                    path: 'services.cards.1.image',
                    url: config.services.cards[1]?.image,
                  },
                  {
                    label: 'The Services Card 3',
                    path: 'services.cards.2.image',
                    url: config.services.cards[2]?.image,
                  },
                  {
                    label: 'Meet Sara Jo Portrait',
                    path: 'meet.mainPortrait.url',
                    url: config.meet.mainPortrait?.url,
                  },
                  {
                    label: 'CTA Banner Background',
                    path: 'ctaBanner.bgImage',
                    url: config.ctaBanner?.bgImage,
                  },
                ].map((photo, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImageEdit({
                      path: photo.path,
                      currentUrl: photo.url || '',
                      label: photo.label,
                    })}
                    className="flex items-center space-x-3 p-2 bg-black/40 hover:bg-white/10 rounded-xs border border-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="relative w-12 h-12 rounded-xs overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                      {photo.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.url} alt={photo.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">No img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{photo.label}</p>
                      <p className="text-[10px] text-amber-400/80 group-hover:text-amber-300">Click to replace photo ➔</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-white/10 bg-black/40 space-y-2 shrink-0 font-sjs-body">
          <button
            type="button"
            onClick={saveConfig}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xs font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all"
          >
            <span>💾</span>
            <span>Save All Changes</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all custom text, font sizes, and photos to original defaults?')) {
                  resetToDefaults();
                }
              }}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xs text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Reset Defaults
            </button>

            <Link
              href="/sarajosmith"
              target="_blank"
              className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xs text-[10px] uppercase tracking-wider transition-colors text-center cursor-pointer flex items-center justify-center space-x-1"
            >
              <span>Public Site</span>
              <span>↗</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Floating Save Confirmation Toast */}
      {isSavedToastVisible && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B18] text-emerald-400 border border-emerald-500/50 shadow-2xl px-5 py-3 rounded-xs flex items-center space-x-3 font-sjs-body text-xs animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-base">✓</span>
          <div>
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">
              Changes Saved Successfully!
            </p>
            <p className="text-zinc-300 text-[10px]">
              Custom text, font sizes, photos, and links are saved and live on the public site.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

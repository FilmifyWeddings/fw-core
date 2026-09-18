'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { siteConfig, PricingPackage } from '@/data/saraJoSmithConfig';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPackage?: PricingPackage | null;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  preselectedPackage,
}) => {
  const { contact, assets } = siteConfig;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sessionType, setSessionType] = useState(preselectedPackage ? preselectedPackage.title : contact.sessionTypes[0]);
  const [desiredDate, setDesiredDate] = useState('');
  const [location, setLocation] = useState('');
  const [story, setStory] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedPackage) {
      setSessionType(preselectedPackage.title);
    }
  }, [preselectedPackage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      setSubmitted(false);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#292421]/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-3xl bg-[#EFECE3] border border-[#292421]/20 shadow-2xl rounded-xs p-6 sm:p-10 md:p-12 z-10 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-[#292421]/70 hover:text-[#292421] transition-colors focus:outline-none"
          aria-label="Close form"
        >
          <span className="font-sjs-heading text-2xl uppercase tracking-widest leading-none">✕</span>
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="text-center max-w-xl mx-auto mb-8 space-y-3">
              <div className="relative w-12 h-12 mx-auto mb-2 opacity-85">
                <Image
                  src={assets.heartBrandElement}
                  alt="Emblem"
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <h3 className="font-sjs-heading text-2xl sm:text-3xl md:text-4xl uppercase tracking-[0.02em] text-[#292421]">
                {contact.heading}
              </h3>
              <p className="font-sjs-body text-xs sm:text-sm text-[#292421]/75 leading-relaxed">
                {contact.subheading}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sjs-body text-[11px] uppercase tracking-[0.15em] text-[#292421] mb-1.5 font-medium">
                    your name? *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First & Last Name"
                    className="w-full bg-[#FAF8F5] border border-[#292421]/20 rounded-xs px-3.5 py-2.5 font-sjs-body text-xs text-[#292421] focus:outline-none focus:border-[#292421] transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-sjs-body text-[11px] uppercase tracking-[0.15em] text-[#292421] mb-1.5 font-medium">
                    email address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-[#FAF8F5] border border-[#292421]/20 rounded-xs px-3.5 py-2.5 font-sjs-body text-xs text-[#292421] focus:outline-none focus:border-[#292421] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sjs-body text-[11px] uppercase tracking-[0.15em] text-[#292421] mb-1.5 font-medium">
                    type of session *
                  </label>
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#292421]/20 rounded-xs px-3.5 py-2.5 font-sjs-body text-xs text-[#292421] focus:outline-none focus:border-[#292421] transition-colors"
                  >
                    {contact.sessionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-sjs-body text-[11px] uppercase tracking-[0.15em] text-[#292421] mb-1.5 font-medium">
                    desired session date *
                  </label>
                  <input
                    type="date"
                    required
                    value={desiredDate}
                    onChange={(e) => setDesiredDate(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#292421]/20 rounded-xs px-3.5 py-2.5 font-sjs-body text-xs text-[#292421] focus:outline-none focus:border-[#292421] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-sjs-body text-[11px] uppercase tracking-[0.15em] text-[#292421] mb-1.5 font-medium">
                  preferred session location *
                </label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State, Venue, or Scenic Destination"
                  className="w-full bg-[#FAF8F5] border border-[#292421]/20 rounded-xs px-3.5 py-2.5 font-sjs-body text-xs text-[#292421] focus:outline-none focus:border-[#292421] transition-colors"
                />
              </div>

              <div>
                <label className="block font-sjs-body text-[11px] uppercase tracking-[0.15em] text-[#292421] mb-1.5 font-medium">
                  share a little more about yourself and your vision for this session. I&apos;d love to hear your story!
                </label>
                <textarea
                  rows={4}
                  required
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Tell me about your love story, the vibe you're envisioning, and any moments that are most important to you..."
                  className="w-full bg-[#FAF8F5] border border-[#292421]/20 rounded-xs px-3.5 py-2.5 font-sjs-body text-xs text-[#292421] focus:outline-none focus:border-[#292421] transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[10px] text-[#292421]/60 font-sjs-body">
                  <span>{contact.sessionHours.description}</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-10 py-3.5 rounded-xs bg-[#292421] text-white font-sjs-body text-xs uppercase tracking-[0.2em] hover:bg-black transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'sending note...' : 'send my inquiry'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="text-center py-10 px-4 space-y-6">
            <div className="relative w-16 h-16 mx-auto opacity-90">
              <Image
                src={assets.sunElement}
                alt="Thank You"
                fill
                className="object-contain"
                sizes="64px"
              />
            </div>

            <h3 className="font-sjs-heading text-3xl sm:text-4xl uppercase tracking-wide text-[#292421]">
              {contact.successTitle}
            </h3>

            <p className="font-sjs-body text-xs sm:text-sm leading-relaxed text-[#292421]/80 max-w-lg mx-auto">
              {contact.successMessage}
            </p>

            <button
              onClick={onClose}
              className="inline-block px-8 py-3 rounded-xs border border-[#292421] font-sjs-body text-xs uppercase tracking-[0.2em] text-[#292421] hover:bg-[#292421] hover:text-white transition-colors mt-4"
            >
              explore love stories
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

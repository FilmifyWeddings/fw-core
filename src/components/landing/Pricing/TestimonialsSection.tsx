'use client';

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Rahul Sharma',
    role: 'Wedding Photographer',
    city: 'Mumbai',
    avatar: '/assets/images/avatars/avatar-01.webp',
    text: 'StudioCore has completely changed the way I run my studio. I save at least 10 hours every week!',
    featured: false,
  },
  {
    id: 2,
    name: 'Priya & Karan',
    role: 'Photography Team',
    city: 'Bangalore',
    avatar: '/assets/images/avatars/avatar-02.webp',
    text: 'The automation and follow-ups are a game changer. We never miss a lead now.',
    featured: false,
  },
  {
    id: 3,
    name: 'Amit Verma',
    role: 'Cinematographer',
    city: 'Delhi',
    avatar: '/assets/images/avatars/avatar-03.webp',
    text: 'Managing payments, teams and projects in one place has made our workflow so much smoother.',
    featured: true,
  },
  {
    id: 4,
    name: 'Neha Singh',
    role: 'Portrait Photographer',
    city: 'Lucknow',
    avatar: '/assets/images/avatars/avatar-01.webp',
    text: 'The post-production workflow is so well designed. It keeps everything organized.',
    featured: false,
  },
  {
    id: 5,
    name: 'Vikram Patel',
    role: 'Studio Owner',
    city: 'Ahmedabad',
    avatar: '/assets/images/avatars/avatar-02.webp',
    text: 'Finally, a system built specifically for photographers. Absolutely love it!',
    featured: false,
  },
];

export const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(2); // Center Amit Verma by default

  // Auto carousel slide for mobile
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full mb-20 select-none">
      {/* Testimonials Header */}
      <div className="w-full text-center mb-10">
        <h2 className="font-serif text-[38px] sm:text-[46px] lg:text-[52px] font-normal leading-[1.08] tracking-tight text-[#211B17] mb-3">
          <span>Loved by Photographers. </span>
          <br className="hidden sm:block" />
          <span className="text-[#C89435] italic drop-shadow-[0_2px_10px_rgba(200,148,53,0.12)]">
            Trusted by Thousands.
          </span>
        </h2>
        <p className="text-[14px] sm:text-[15px] lg:text-[16px] text-[#746E67] max-w-2xl mx-auto leading-relaxed mb-4">
          See how StudioCore is helping photography businesses save time, get organized and grow faster.
        </p>

        {/* 5-Star Rating */}
        <div className="inline-flex items-center gap-2 bg-[#FAF7F1] px-4 py-1.5 rounded-full border border-[#E9E0D4]">
          <div className="flex items-center text-[#C89435]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-[#C89435] text-[#C89435]" />
            ))}
          </div>
          <span className="text-[12.5px] font-medium text-[#4A443E]">
            <strong className="font-bold text-[#211B17]">4.9/5</strong> from 600+ photographers
          </span>
        </div>
      </div>

      {/* Testimonial Cards Grid (Desktop 5 cards / Mobile responsive carousel) */}
      <div className="hidden lg:grid grid-cols-5 gap-4 w-full max-w-[1520px] mx-auto items-stretch">
        {testimonials.map((t) => (
          <div
            key={t.id}
            className={`bg-[#FFFCF8] rounded-[20px] p-5 flex flex-col justify-between shadow-[0_8px_20px_rgba(33,27,23,0.03)] relative hover:-translate-y-1 transition-all duration-300 ${
              t.featured
                ? 'border-2 border-[#C89435] shadow-[0_12px_28px_rgba(200,148,53,0.12)]'
                : 'border border-[#E9E0D4]'
            }`}
          >
            {/* Oversized quote mark */}
            <div className="absolute top-3 right-4 font-serif text-[42px] font-bold text-[#E9DCCA]/60 select-none pointer-events-none leading-none">
              “
            </div>

            <div>
              {/* Profile */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover border border-[#E9E0D4] flex-shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-[13.5px] font-bold text-[#211B17] truncate">{t.name}</h4>
                  <div className="text-[11px] text-[#746E67] truncate">{t.role}</div>
                  <div className="text-[10px] text-[#99928A]">{t.city}</div>
                </div>
              </div>

              {/* Text */}
              <p className="text-[12px] text-[#4A443E] leading-relaxed italic">
                "{t.text}"
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile / Tablet Carousel View */}
      <div className="grid lg:hidden grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
        {testimonials.slice(0, 2).map((t) => (
          <div
            key={t.id}
            className="bg-[#FFFCF8] rounded-[20px] border border-[#E9E0D4] p-5 flex flex-col justify-between shadow-xs relative"
          >
            <div className="absolute top-3 right-4 font-serif text-[42px] font-bold text-[#E9DCCA]/60 leading-none">
              “
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover border border-[#E9E0D4]"
                />
                <div>
                  <h4 className="text-[13.5px] font-bold text-[#211B17]">{t.name}</h4>
                  <div className="text-[11px] text-[#746E67]">{t.role} · {t.city}</div>
                </div>
              </div>
              <p className="text-[12px] text-[#4A443E] leading-relaxed italic">
                "{t.text}"
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Navigation Dots */}
      <div className="flex items-center justify-center gap-2 mt-8">
        {testimonials.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              idx === activeIndex
                ? 'w-6 bg-[#C89435]'
                : 'w-2 bg-[#E9E0D4] hover:bg-[#C89435]/50'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

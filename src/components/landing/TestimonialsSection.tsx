'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, Award, Camera, CheckCircle2 } from 'lucide-react';

export function TestimonialsSection() {
  const reviews = [
    {
      name: 'Vikramaditya Roy',
      studio: 'Royal Wedding Stories (Udaipur & Goa)',
      review: 'StudioCore transformed our studio operations overnight. Meta leads sync within 1 second, WhatsApp sends the rate card automatically, and we booked ₹45L in retainers last month without missing a single lead.',
      rating: 5,
      location: 'Udaipur, Rajasthan',
      tag: '50+ Weddings/Yr'
    },
    {
      name: 'Ananya Sharma',
      studio: 'Elysian Visuals (Mumbai)',
      review: 'The WhatsApp drip automation and 3D quotation builder are pure magic. Couples love receiving instant PDF proposals on WhatsApp, and our retainer collection speed jumped by 300%.',
      rating: 5,
      location: 'Mumbai, Maharashtra',
      tag: 'Luxury Destination Studio'
    },
    {
      name: 'Sahil & Sushant',
      studio: 'FilmifyWeddings Studio OS Users',
      review: 'Having custom metadata columns like Groom Name, Bride Name, Event Venue, and Budget Range directly synchronized with post-production tasks gave us complete peace of mind.',
      rating: 5,
      location: 'Pune & Delhi',
      tag: 'Multi-City Production House'
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[#FFFDF9] dark:bg-[#0C0B0A] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#B89047] text-xs font-black uppercase tracking-widest mb-6">
          <Award className="w-3.5 h-3.5" />
          Real Studio Owner Reviews
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-[#1A1917] dark:text-[#FAF8F5]">
          Loved by India's Premier <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#B89047] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
            Wedding Photography Brands.
          </span>
        </h2>

        {/* REVIEWS GRID */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {reviews.map((rev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-gradient-to-br from-[#FAF8F5] to-[#FFFDF9] dark:from-[#141210] dark:to-[#1C1A18] border border-[#EAE3D2] dark:border-[#2C2926] shadow-sm hover:border-[#D4AF37] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 mb-4 text-[#D4AF37]">
                  {[...Array(rev.rating)].map((_, r) => (
                    <Star key={r} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <p className="text-sm text-[#3A3630] dark:text-[#E5DFD5] font-medium leading-relaxed italic font-serif">
                  "{rev.review}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#EAE3D2] dark:border-[#2C2926]">
                <div className="font-bold text-[#1A1917] dark:text-white text-sm font-serif">{rev.name}</div>
                <div className="text-xs font-semibold text-[#B89047] mt-0.5">{rev.studio}</div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-[#7A756E]">
                  <span>{rev.location}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">{rev.tag}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bee Queen Curtail (बी क्वीन कर्टेल) | Royal Bridal & Indo-Western Couture',
  description:
    'Experience the next generation of 3D luxury couture. Royal Indian heritage fused with contemporary high-fashion minimalist aesthetics. 360° interactive runway, virtual dressing room, and bespoke atelier appointments.',
  openGraph: {
    title: 'Bee Queen Curtail | Royal Bridal & Indo-Western Haute Couture',
    description:
      'Next-generation 3D interactive royal fashion experience. Featuring 360° dress inspection, virtual fitting, and master craftsmanship archives.',
    siteName: 'Bee Queen Curtail',
    type: 'website',
  },
};

export default function BeeQueenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen bg-[#FBF8F3] text-[#2A2723] selection:bg-[#D4AF37]/30 selection:text-[#2A2723]">
      {children}
    </div>
  );
}

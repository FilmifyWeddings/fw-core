import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, filename } = body;

    // Simulate AI vision layout and typography extraction
    // Generates a reusable 4-page quotation template JSON mapping coordinates, colors, and placeholders
    const mockImporterResponse = {
      success: true,
      message: 'AI Vision analysis successful. Extracted layout coordinates and style tokens.',
      couple_names: 'SUSHANT x SHWETA',
      client_name: 'Premium Editorial Quotation Draft',
      pricing_summary: {
        regular_price: 120000,
        offer_price: 99000,
        savings: 21000
      },
      pages: [
        // Page 1: Cover
        {
          pageIndex: 0,
          pageType: 'cover',
          elements: [
            {
              id: 'cover-couple-names',
              type: 'text',
              content: 'SUSHANT x SHWETA',
              x: 10, y: 8, width: 80, height: 10,
              fontSize: 38, fontFamily: 'Playfair Display', color: '#606248',
              fontWeight: 'bold', textAlign: 'center', isLocked: false, isPlaceholder: true, placeholderKey: 'couple_names'
            },
            {
              id: 'cover-subtitle-1',
              type: 'text',
              content: 'WEDDING QUOTATION',
              x: 10, y: 22, width: 80, height: 5,
              fontSize: 18, fontFamily: 'Cormorant Garamond', color: '#C2B280',
              fontWeight: 'normal', textAlign: 'center', letterSpacing: '0.25em', isLocked: true
            },
            {
              id: 'cover-subtitle-2',
              type: 'text',
              content: 'BOTH SIDES - GOA, INDIA',
              x: 10, y: 26, width: 80, height: 5,
              fontSize: 11, fontFamily: 'Inter', color: '#706E6A',
              fontWeight: 'normal', textAlign: 'center', letterSpacing: '0.05em', isLocked: false, isPlaceholder: true, placeholderKey: 'location'
            },
            {
              id: 'cover-logo-text',
              type: 'text',
              content: 'FILMIFY WEDDINGS',
              x: 10, y: 35, width: 80, height: 6,
              fontSize: 22, fontFamily: 'Cormorant Garamond', color: '#606248',
              fontWeight: 'bold', textAlign: 'center', letterSpacing: '0.18em', isLocked: true
            },
            {
              id: 'cover-hero-image',
              type: 'image',
              content: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
              x: 15, y: 46, width: 70, height: 46, isLocked: false, isPlaceholder: true, placeholderKey: 'photo1'
            }
          ]
        },
        // Page 2: About Us
        {
          pageIndex: 1,
          pageType: 'about',
          elements: [
            {
              id: 'about-heading',
              type: 'text',
              content: 'ABOUT US',
              x: 10, y: 15, width: 80, height: 10,
              fontSize: 28, fontFamily: 'Playfair Display', color: '#606248',
              fontWeight: 'bold', textAlign: 'center', isLocked: true
            },
            {
              id: 'about-quote',
              type: 'text',
              content: 'Glowwed films strive to capture your love story in the most gracious way possible. All the memories of your event will be hand-picked with precision and made into films & photographs that you can cherish forever.',
              x: 12, y: 30, width: 76, height: 20,
              fontSize: 15, fontFamily: 'Cormorant Garamond', color: '#111111',
              fontWeight: 'normal', textAlign: 'center', fontStyle: 'italic', isLocked: false, isPlaceholder: true, placeholderKey: 'terms'
            },
            {
              id: 'about-img-left',
              type: 'image',
              content: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=600',
              x: 10, y: 55, width: 38, height: 35, isLocked: false, isPlaceholder: true, placeholderKey: 'photo2'
            },
            {
              id: 'about-img-right',
              type: 'image',
              content: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=600',
              x: 52, y: 55, width: 38, height: 35, isLocked: false, isPlaceholder: true, placeholderKey: 'photo3'
            }
          ]
        },
        // Page 3: Functions & Deliverables
        {
          pageIndex: 2,
          pageType: 'functions',
          elements: [
            {
              id: 'functions-heading',
              type: 'text',
              content: 'FUNCTIONS',
              x: 10, y: 5, width: 80, height: 6,
              fontSize: 24, fontFamily: 'Playfair Display', color: '#606248',
              fontWeight: 'bold', textAlign: 'center', isLocked: true
            },
            {
              id: 'deliverables-heading',
              type: 'text',
              content: 'Deliverables',
              x: 10, y: 44, width: 80, height: 6,
              fontSize: 22, fontFamily: 'Cormorant Garamond', color: '#606248',
              fontWeight: 'bold', textAlign: 'center', fontStyle: 'italic', isLocked: true
            }
          ]
        },
        // Page 4: Early Booking Offer
        {
          pageIndex: 3,
          pageType: 'pricing',
          elements: [
            {
              id: 'pricing-heading',
              type: 'text',
              content: 'EARLY BOOKING OFFER',
              x: 10, y: 8, width: 80, height: 8,
              fontSize: 32, fontFamily: 'Playfair Display', color: '#606248',
              fontWeight: 'bold', textAlign: 'center', isLocked: true
            },
            {
              id: 'pricing-main-price',
              type: 'text',
              content: 'Rs 99,000/-',
              x: 20, y: 18, width: 60, height: 8,
              fontSize: 34, fontFamily: 'Playfair Display', color: '#606248',
              fontWeight: 'bold', textAlign: 'center', isLocked: false, isPlaceholder: true, placeholderKey: 'offer'
            },
            {
              id: 'pricing-regular-price',
              type: 'text',
              content: 'Regular Quotation : Rs 1,20,000/-',
              x: 20, y: 28, width: 60, height: 5,
              fontSize: 16, fontFamily: 'Inter', color: '#706E6A',
              fontWeight: 'normal', textAlign: 'center', isLocked: false, isPlaceholder: true, placeholderKey: 'price'
            },
            {
              id: 'pricing-excludes',
              type: 'text',
              content: 'This excludes travel, accommodation, food & any add-on services.',
              x: 15, y: 35, width: 70, height: 4,
              fontSize: 10, fontFamily: 'Inter', color: '#706E6A',
              fontWeight: 'normal', textAlign: 'center', isLocked: true
            },
            {
              id: 'pricing-savings-banner',
              type: 'text',
              content: 'Save Rs 21,000 With Our Special Offer. The Special Offer Ends in the Next 7 days.',
              x: 10, y: 44, width: 80, height: 8,
              fontSize: 14, fontFamily: 'Inter', color: '#FFFFFF',
              fontWeight: 'bold', textAlign: 'center', isLocked: true
            },
            {
              id: 'pricing-palace-image',
              type: 'image',
              content: 'https://images.unsplash.com/photo-1546412414-8035e1776c9a?auto=format&fit=crop&q=80&w=800',
              x: 10, y: 56, width: 80, height: 28, isLocked: false, isPlaceholder: true, placeholderKey: 'photo4'
            },
            {
              id: 'pricing-logo-text',
              type: 'text',
              content: 'FILMIFY WEDDINGS',
              x: 10, y: 88, width: 80, height: 5,
              fontSize: 18, fontFamily: 'Cormorant Garamond', color: '#606248',
              fontWeight: 'bold', textAlign: 'center', letterSpacing: '0.1em', isLocked: true
            }
          ]
        }
      ]
    };

    return NextResponse.json(mockImporterResponse);
  } catch (err: any) {
    console.error('Import template error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

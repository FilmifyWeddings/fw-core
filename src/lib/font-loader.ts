export interface FontItem {
  name: string;
  family: string;
  category: 'Custom Fonts' | 'Luxury Serif' | 'Minimal Sans-Serif' | 'Display';
  fileUrl?: string;
  format?: 'truetype' | 'opentype';
}

// Pre-defined static list of custom fonts
export const STATIC_CUSTOM_FONTS: FontItem[] = [
  { name: 'Aligin', family: "'Aligin', sans-serif", fileUrl: '/custom-fonts/aligin.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Amida', family: "'Amida', sans-serif", fileUrl: '/custom-fonts/amida.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Aurora Girl', family: "'Aurora Girl', sans-serif", fileUrl: '/custom-fonts/auroragirl.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Bevola Demo Regular', family: "'Bevola Demo Regular', sans-serif", fileUrl: '/custom-fonts/BevolaDemo-Regular-BF69b9581c161bc.ttf', format: 'truetype', category: 'Custom Fonts' },
  { name: 'Black Runters', family: "'Black Runters', sans-serif", fileUrl: '/custom-fonts/BlackRunters-qZa01.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Edwardian', family: "'Edwardian', serif", fileUrl: '/custom-fonts/Edwardian.ttf', format: 'truetype', category: 'Custom Fonts' },
  { name: 'Gloci', family: "'Gloci', sans-serif", fileUrl: '/custom-fonts/gloci.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Hakuna', family: "'Hakuna', sans-serif", fileUrl: '/custom-fonts/hakuna.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Lostgun Regular', family: "'Lostgun Regular', sans-serif", fileUrl: '/custom-fonts/lostgun-regular.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Mirella', family: "'Mirella', sans-serif", fileUrl: '/custom-fonts/Mirella-BF69e07549cc426.ttf', format: 'truetype', category: 'Custom Fonts' },
  { name: 'Monic', family: "'Monic', sans-serif", fileUrl: '/custom-fonts/monic.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Morgena Regular', family: "'Morgena Regular', serif", fileUrl: '/custom-fonts/morgenaregular-vnvel.ttf', format: 'truetype', category: 'Custom Fonts' },
  { name: 'Qasira', family: "'Qasira', serif", fileUrl: '/custom-fonts/Qasira.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Rivage Personal Use', family: "'Rivage Personal Use', serif", fileUrl: '/custom-fonts/RivagePersonalUse-jEPVj.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Soligant', family: "'Soligant', serif", fileUrl: '/custom-fonts/Soligant.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Tan Pearl', family: "'Tan Pearl', serif", fileUrl: '/custom-fonts/tan-pearl.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'The Baethmy', family: "'The Baethmy', serif", fileUrl: '/custom-fonts/the-baethmy.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'The Baethmy Italic', family: "'The Baethmy Italic', serif", fileUrl: '/custom-fonts/the-baethmy-italic.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Vigro', family: "'Vigro', serif", fileUrl: '/custom-fonts/vigro.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Vigro Italic', family: "'Vigro Italic', serif", fileUrl: '/custom-fonts/vigro-italic.otf', format: 'opentype', category: 'Custom Fonts' },
  { name: 'Wondershine', family: "'Wondershine', cursive", fileUrl: '/custom-fonts/Wondershine.otf', format: 'opentype', category: 'Custom Fonts' },
];

export const SYSTEM_LUXURY_SERIF_FONTS: FontItem[] = [
  { name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'Luxury Serif' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", category: 'Luxury Serif' },
  { name: 'Bodoni Moda', family: "'Bodoni Moda', serif", category: 'Luxury Serif' },
  { name: 'Cinzel', family: "'Cinzel', serif", category: 'Luxury Serif' },
  { name: 'DM Serif Display', family: "'DM Serif Display', serif", category: 'Luxury Serif' },
  { name: 'Prata', family: "'Prata', serif", category: 'Luxury Serif' },
  { name: 'Italiana', family: "'Italiana', serif", category: 'Luxury Serif' },
  { name: 'Marcellus', family: "'Marcellus', serif", category: 'Luxury Serif' },
  { name: 'Georgia', family: "Georgia, serif", category: 'Luxury Serif' },
];

export const SYSTEM_SANS_SERIF_FONTS: FontItem[] = [
  { name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'Minimal Sans-Serif' },
  { name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Minimal Sans-Serif' },
  { name: 'Inter', family: "'Inter', sans-serif", category: 'Minimal Sans-Serif' },
  { name: 'Outfit', family: "'Outfit', sans-serif", category: 'Minimal Sans-Serif' },
  { name: 'Tenor Sans', family: "'Tenor Sans', sans-serif", category: 'Minimal Sans-Serif' },
  { name: 'Josefin Sans', family: "'Josefin Sans', sans-serif", category: 'Minimal Sans-Serif' },
  { name: 'Arial', family: "Arial, sans-serif", category: 'Minimal Sans-Serif' },
];

export const SYSTEM_DISPLAY_FONTS: FontItem[] = [
  { name: 'Great Vibes', family: "'Great Vibes', cursive", category: 'Display' },
  { name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'Display' },
  { name: 'Brush Script MT', family: "'Brush Script MT', cursive", category: 'Display' },
];

const registeredFontFamilies = new Set<string>();
let combinedStyleElement: HTMLStyleElement | null = null;

/**
 * Registers font CSS definitions into a single combined style block in document.head
 * Uses browser-native lazy font fetching with font-display: swap (Zero upfront downloads!)
 */
export function registerFontFace(font: FontItem): void {
  if (typeof window === 'undefined' || !font.fileUrl) return;
  
  const cleanFamilyName = font.name;
  if (registeredFontFamilies.has(cleanFamilyName)) return;

  const fontFormat = font.format || (font.fileUrl.endsWith('.otf') ? 'opentype' : 'truetype');
  
  if (!combinedStyleElement) {
    combinedStyleElement = document.getElementById('studiocore-font-definitions') as HTMLStyleElement;
    if (!combinedStyleElement) {
      combinedStyleElement = document.createElement('style');
      combinedStyleElement.id = 'studiocore-font-definitions';
      document.head.appendChild(combinedStyleElement);
    }
  }

  combinedStyleElement.innerHTML += `
    @font-face {
      font-family: '${cleanFamilyName}';
      src: url('${font.fileUrl}') format('${fontFormat}');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  `;

  registeredFontFamilies.add(cleanFamilyName);
}

/**
 * Register array of font items (CSS-only injection without eager network load)
 */
export function registerAllFonts(fonts: FontItem[]): void {
  fonts.forEach(font => registerFontFace(font));
}

/**
 * Preload and activate a specific single font on-demand when selected or used in document
 */
export async function preloadActiveFont(fontNameOrFamily: string): Promise<void> {
  if (typeof window === 'undefined' || !fontNameOrFamily) return;

  const cleanName = fontNameOrFamily.replace(/['",]/g, '').trim();
  const fontItem = STATIC_CUSTOM_FONTS.find(
    f => f.name.toLowerCase() === cleanName.toLowerCase() || f.family.toLowerCase().includes(cleanName.toLowerCase())
  );

  if (fontItem && fontItem.fileUrl && 'FontFace' in window) {
    try {
      const fontFormat = fontItem.format || (fontItem.fileUrl.endsWith('.otf') ? 'opentype' : 'truetype');
      const fontFace = new FontFace(fontItem.name, `url('${fontItem.fileUrl}') format('${fontFormat}')`);
      const loaded = await fontFace.load();
      document.fonts.add(loaded);
    } catch (err) {
      console.warn(`[FontLoader] Error preloading active font ${cleanName}:`, err);
    }
  }
}

/**
 * Initializes font definitions once on client start
 */
export async function loadCustomFontsFromAPI(): Promise<FontItem[]> {
  // Register static list CSS definitions immediately without network blocking
  registerAllFonts(STATIC_CUSTOM_FONTS);
  return STATIC_CUSTOM_FONTS;
}

/**
 * Ensures that loaded fonts are ready before PDF export or canvas snapshot
 */
export async function ensureFontsReady(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (err) {
      console.warn('[FontLoader] Error waiting for document.fonts.ready:', err);
    }
  }
}

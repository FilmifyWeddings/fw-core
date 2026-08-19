// Server-Safe Shared Theme Registry & Design Tokens
export const COLOR_THEMES: Record<string, any> = {
  'cherry-red-cream': {
    id: 'cherry-red-cream',
    name: 'Cherry Red & Cream',
    aliases: ['cherry-red-cream', 'cherry red & cream', 'cherry red', 'cherry'],
    primary: '#750505',
    background: '#FBFCEB',
    text: '#750505',
    kicker: '#750505',
    borderColor: 'rgba(117, 5, 5, 0.2)',
    boxBgColor: 'rgba(117, 5, 5, 0.06)',
  },
  'cream-cherry-red': {
    id: 'cream-cherry-red',
    name: 'Cream & Cherry Red (Inverted)',
    aliases: ['cream-cherry-red', 'cream & cherry red (inverted)', 'cream & cherry red', 'cherry inverted'],
    primary: '#FBFCEB',
    background: '#750505',
    text: '#FBFCEB',
    kicker: '#FFECD1',
    borderColor: 'rgba(251, 252, 235, 0.25)',
    boxBgColor: 'rgba(251, 252, 235, 0.08)',
    isDark: true,
  },
  'cyprus-sand-dune': {
    id: 'cyprus-sand-dune',
    name: 'Cyprus & Sand Dune',
    aliases: ['cyprus-sand-dune', 'cyprus & sand dune', 'cyprus'],
    primary: '#004643',
    background: '#F0EDE5',
    text: '#004643',
    kicker: '#004643',
    borderColor: 'rgba(0, 70, 67, 0.2)',
    boxBgColor: 'rgba(0, 70, 67, 0.06)',
  },
  'sand-dune-cyprus': {
    id: 'sand-dune-cyprus',
    name: 'Sand Dune & Cyprus (Inverted)',
    aliases: ['sand-dune-cyprus', 'sand dune & cyprus (inverted)', 'sand dune & cyprus', 'cyprus inverted'],
    primary: '#F0EDE5',
    background: '#004643',
    text: '#F0EDE5',
    kicker: '#E6CFA7',
    borderColor: 'rgba(240, 237, 229, 0.25)',
    boxBgColor: 'rgba(240, 237, 229, 0.08)',
    isDark: true,
  },
  'plum-milk': {
    id: 'plum-milk',
    name: 'Plum & Milk',
    aliases: ['plum-milk', 'plum & milk', 'plum'],
    primary: '#381932',
    background: '#FFF3E6',
    text: '#381932',
    kicker: '#381932',
    borderColor: 'rgba(56, 25, 50, 0.2)',
    boxBgColor: 'rgba(56, 25, 50, 0.06)',
  },
  'milk-plum': {
    id: 'milk-plum',
    name: 'Milk & Plum (Inverted)',
    aliases: ['milk-plum', 'milk & plum (inverted)', 'milk & plum', 'plum inverted'],
    primary: '#FFF3E6',
    background: '#381932',
    text: '#FFF3E6',
    kicker: '#FFECD1',
    borderColor: 'rgba(255, 243, 230, 0.25)',
    boxBgColor: 'rgba(255, 243, 230, 0.08)',
    isDark: true,
  },
  'sand-chocolate': {
    id: 'sand-chocolate',
    name: 'Sand & Chocolate',
    aliases: ['sand-chocolate', 'sand & chocolate', 'chocolate'],
    primary: '#3E000C',
    background: '#FFECD1',
    text: '#3E000C',
    kicker: '#3E000C',
    borderColor: 'rgba(62, 0, 12, 0.2)',
    boxBgColor: 'rgba(62, 0, 12, 0.06)',
  },
  'chocolate-sand': {
    id: 'chocolate-sand',
    name: 'Chocolate & Sand (Inverted)',
    aliases: ['chocolate-sand', 'chocolate & sand (inverted)', 'chocolate & sand', 'chocolate inverted'],
    primary: '#FFECD1',
    background: '#3E000C',
    text: '#FFECD1',
    kicker: '#FFECD1',
    borderColor: 'rgba(255, 236, 209, 0.25)',
    boxBgColor: 'rgba(255, 236, 209, 0.08)',
    isDark: true,
  },
  'feldgrau-wheat': {
    id: 'feldgrau-wheat',
    name: 'Feldgrau & Wheat',
    aliases: ['feldgrau-wheat', 'feldgrau & wheat', 'feldgrau'],
    primary: '#3A4B41',
    background: '#E6CFA7',
    text: '#3A4B41',
    kicker: '#3A4B41',
    borderColor: 'rgba(58, 75, 65, 0.2)',
    boxBgColor: 'rgba(58, 75, 65, 0.06)',
  },
  'wheat-feldgrau': {
    id: 'wheat-feldgrau',
    name: 'Wheat & Feldgrau (Inverted)',
    aliases: ['wheat-feldgrau', 'wheat & feldgrau (inverted)', 'wheat & feldgrau', 'wheat inverted'],
    primary: '#E6CFA7',
    background: '#3A4B41',
    text: '#E6CFA7',
    kicker: '#E6CFA7',
    borderColor: 'rgba(230, 207, 167, 0.25)',
    boxBgColor: 'rgba(230, 207, 167, 0.08)',
    isDark: true,
  },
  'noctis-marigold': {
    id: 'noctis-marigold',
    name: 'Noctis & Marigold',
    aliases: ['noctis-marigold', 'noctis & marigold', 'marigold', 'noctis'],
    primary: '#1F2235',
    background: '#E3A419',
    text: '#1F2235',
    kicker: '#1F2235',
    borderColor: 'rgba(31, 34, 53, 0.2)',
    boxBgColor: 'rgba(31, 34, 53, 0.08)',
  },
  'marigold-noctis': {
    id: 'marigold-noctis',
    name: 'Marigold & Noctis (Inverted)',
    aliases: ['marigold-noctis', 'marigold & noctis (inverted)', 'marigold & noctis', 'marigold inverted'],
    primary: '#E3A419',
    background: '#1F2235',
    text: '#E3A419',
    kicker: '#E3A419',
    borderColor: 'rgba(227, 164, 25, 0.25)',
    boxBgColor: 'rgba(227, 164, 25, 0.08)',
    isDark: true,
  },
  'champagne-obsidian': {
    id: 'champagne-obsidian',
    name: 'Champagne & Obsidian',
    aliases: ['champagne-obsidian', 'champagne & obsidian', 'champagne', 'obsidian'],
    primary: '#111111',
    background: '#F7F4EF',
    text: '#111111',
    kicker: '#71717A',
    borderColor: 'rgba(228, 228, 231, 1)',
    boxBgColor: 'rgba(244, 244, 245, 1)',
  },
  'obsidian-champagne': {
    id: 'obsidian-champagne',
    name: 'Obsidian & Champagne (Inverted)',
    aliases: ['obsidian-champagne', 'obsidian & champagne (inverted)', 'obsidian & champagne', 'obsidian inverted'],
    primary: '#F7F4EF',
    background: '#111111',
    text: '#F7F4EF',
    kicker: '#D4D4D8',
    borderColor: 'rgba(247, 244, 239, 0.25)',
    boxBgColor: 'rgba(247, 244, 239, 0.08)',
    isDark: true,
  },
  'forest-olive-ivory': {
    id: 'forest-olive-ivory',
    name: 'Forest Olive & Ivory',
    aliases: ['forest-olive-ivory', 'forest olive & ivory', 'olive', 'forest'],
    primary: '#2C352E',
    background: '#F2EFE9',
    text: '#2C352E',
    kicker: '#58695C',
    borderColor: 'rgba(44, 53, 46, 0.2)',
    boxBgColor: 'rgba(44, 53, 46, 0.06)',
  },
  'ivory-forest-olive': {
    id: 'ivory-forest-olive',
    name: 'Ivory & Forest Olive (Inverted)',
    aliases: ['ivory-forest-olive', 'ivory & forest olive (inverted)', 'ivory & forest olive', 'olive inverted'],
    primary: '#F2EFE9',
    background: '#2C352E',
    text: '#F2EFE9',
    kicker: '#E2DFD9',
    borderColor: 'rgba(242, 239, 233, 0.25)',
    boxBgColor: 'rgba(242, 239, 233, 0.08)',
    isDark: true,
  },
  'airy-white': {
    id: 'airy-white',
    name: 'Airy White (Pre-Wed)',
    aliases: ['airy-white', 'airy white (pre-wed)', 'airy white', 'airy white minimalist', 'minimalist'],
    primary: '#27272A',
    background: '#FFFFFF',
    text: '#27272A',
    kicker: '#A1A1AA',
    borderColor: 'rgba(228, 228, 231, 1)',
    boxBgColor: 'rgba(244, 244, 245, 1)',
  },
  'royal-gold': {
    id: 'royal-gold',
    name: 'Royal Gold (Classic)',
    aliases: ['royal-gold', 'royal gold (classic)', 'royal gold', 'royal gold & cream', 'gold', 'royal'],
    primary: '#8A6D2F',
    background: '#FFF8EA',
    text: '#8A6D2F',
    kicker: '#8A6D2F',
    borderColor: 'rgba(138, 109, 47, 0.25)',
    boxBgColor: 'rgba(138, 109, 47, 0.08)',
  },
  'dark-studio': {
    id: 'dark-studio',
    name: 'Dark Studio',
    aliases: ['dark-studio', 'dark studio', 'dark studio gold', 'studio dark'],
    primary: '#F3F4F6',
    background: '#141622',
    text: '#F3F4F6',
    kicker: '#E5C365',
    borderColor: '#232634',
    boxBgColor: '#0F1017',
    isDark: true,
  },
};

export function getThemeFromKey(key: any) {
  if (!key) return COLOR_THEMES['cyprus-sand-dune'];
  if (typeof key === 'object') {
    if (key.primary && key.background) {
      return {
        id: key.id || 'custom',
        name: key.name || 'Custom Theme',
        primary: key.primary,
        background: key.background,
        text: key.text || key.primary,
        kicker: key.kicker || key.primary,
        borderColor: key.borderColor || 'rgba(0,0,0,0.15)',
        boxBgColor: key.boxBgColor || 'rgba(0,0,0,0.05)',
        isDark: !!key.isDark
      };
    }
    key = key.name || key.id || '';
  }
  const strKey = String(key).trim();
  if (COLOR_THEMES[strKey]) return COLOR_THEMES[strKey];

  const lowerKey = strKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const val of Object.values(COLOR_THEMES)) {
    const valId = val.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const valName = val.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (valId === lowerKey || valName === lowerKey || valName.includes(lowerKey) || lowerKey.includes(valId)) {
      return val;
    }
    if (Array.isArray(val.aliases)) {
      for (const alias of val.aliases) {
        const aSlug = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (aSlug === lowerKey || lowerKey.includes(aSlug) || aSlug.includes(lowerKey)) {
          return val;
        }
      }
    }
  }
  return COLOR_THEMES['cyprus-sand-dune'];
}

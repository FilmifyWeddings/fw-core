export interface CoverPositioning {
  url: string;
  desktop: { x: number; y: number; zoom: number };
  mobile: { x: number; y: number; zoom: number };
}

export function parseCoverUrl(coverUrl: string | null | undefined): CoverPositioning {
  if (!coverUrl) {
    return {
      url: '',
      desktop: { x: 50, y: 50, zoom: 100 },
      mobile: { x: 50, y: 50, zoom: 100 },
    };
  }

  const hashIdx = coverUrl.indexOf('#');
  if (hashIdx === -1) {
    return {
      url: coverUrl,
      desktop: { x: 50, y: 50, zoom: 100 },
      mobile: { x: 50, y: 50, zoom: 100 },
    };
  }

  const url = coverUrl.substring(0, hashIdx);
  const hash = coverUrl.substring(hashIdx + 1);
  const params = new URLSearchParams(hash);

  const dx = parseFloat(params.get('dx') || '50');
  const dy = parseFloat(params.get('dy') || '50');
  const dz = parseFloat(params.get('dz') || '100');

  const mx = parseFloat(params.get('mx') || '50');
  const my = parseFloat(params.get('my') || '50');
  const mz = parseFloat(params.get('mz') || '100');

  return {
    url,
    desktop: {
      x: isNaN(dx) ? 50 : Math.max(0, Math.min(100, dx)),
      y: isNaN(dy) ? 50 : Math.max(0, Math.min(100, dy)),
      zoom: isNaN(dz) ? 100 : Math.max(100, Math.min(250, dz)),
    },
    mobile: {
      x: isNaN(mx) ? 50 : Math.max(0, Math.min(100, mx)),
      y: isNaN(my) ? 50 : Math.max(0, Math.min(100, my)),
      zoom: isNaN(mz) ? 100 : Math.max(100, Math.min(250, mz)),
    },
  };
}

export function buildCoverUrl(
  url: string,
  desktop: { x: number; y: number; zoom: number },
  mobile: { x: number; y: number; zoom: number }
): string {
  const clean = url.split('#')[0];
  return `${clean}#dx=${Math.round(desktop.x)}&dy=${Math.round(desktop.y)}&dz=${Math.round(desktop.zoom)}&mx=${Math.round(mobile.x)}&my=${Math.round(mobile.y)}&mz=${Math.round(mobile.zoom)}`;
}

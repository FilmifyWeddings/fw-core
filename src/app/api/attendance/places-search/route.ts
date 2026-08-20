import { NextRequest, NextResponse } from 'next/server';

interface PlaceResult {
  id: string;
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  type: string;
  category: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const lat = searchParams.get('lat') || '19.0760';
    const lon = searchParams.get('lon') || '72.8777';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const cleanQuery = query.trim();
    const results: PlaceResult[] = [];
    const seenCoordinates = new Set<string>();

    // Parallel fetch from Photon (Komoot OSM POI Engine) and Nominatim
    const [photonRes, nominatimRes] = await Promise.allSettled([
      fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=8&lat=${lat}&lon=${lon}&lang=en`,
        { headers: { 'User-Agent': 'StudioCore-Attendance-Geocoder/1.0' } }
      ).then(r => r.ok ? r.json() : null),
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=8&addressdetails=1&extratags=1&namedetails=1&countrycodes=in`,
        { headers: { 'User-Agent': 'StudioCore-Attendance-Geocoder/1.0' } }
      ).then(r => r.ok ? r.json() : null)
    ]);

    // 1. Process Photon Results (Fast POI & Shop Database)
    if (photonRes.status === 'fulfilled' && photonRes.value?.features) {
      for (const feat of photonRes.value.features) {
        const props = feat.properties || {};
        const coords = feat.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;

        const pLon = coords[0];
        const pLat = coords[1];
        const coordKey = `${pLat.toFixed(3)},${pLon.toFixed(3)}`;
        if (seenCoordinates.has(coordKey)) continue;
        seenCoordinates.add(coordKey);

        const placeName = props.name || props.street || cleanQuery;
        const addressParts = [
          props.housenumber ? `No. ${props.housenumber}` : null,
          props.street,
          props.district || props.suburb || props.locality,
          props.city,
          props.state,
          props.postcode
        ].filter(Boolean);

        const formattedAddress = addressParts.length > 0 
          ? addressParts.join(', ')
          : `${placeName}, ${props.city || props.state || 'India'}`;

        const osmVal = props.osm_value || props.osm_key || 'place';
        let category = 'Business / Place';
        if (['shop', 'supermarket', 'mall', 'boutique', 'commercial'].includes(osmVal)) category = 'Shop / Store';
        else if (['photography', 'studio', 'craft', 'office'].includes(osmVal)) category = 'Studio / Office';
        else if (['hotel', 'guest_house', 'banquet_hall', 'restaurant', 'resort'].includes(osmVal)) category = 'Hotel / Venue';
        else if (['place_of_worship', 'tourism', 'attraction', 'landmark'].includes(osmVal)) category = 'Landmark / Venue';
        else if (['residential', 'building', 'apartments'].includes(osmVal)) category = 'Building / Complex';

        results.push({
          id: `ph_${props.osm_id || Math.random().toString(36).substring(2, 8)}`,
          name: placeName,
          formatted_address: formattedAddress,
          latitude: Number(pLat.toFixed(6)),
          longitude: Number(pLon.toFixed(6)),
          type: osmVal,
          category
        });
      }
    }

    // 2. Process Nominatim Results (Detailed Addresses & Landmarks)
    if (nominatimRes.status === 'fulfilled' && Array.isArray(nominatimRes.value)) {
      for (const item of nominatimRes.value) {
        const nLat = parseFloat(item.lat);
        const nLon = parseFloat(item.lon);
        const coordKey = `${nLat.toFixed(3)},${nLon.toFixed(3)}`;
        if (seenCoordinates.has(coordKey)) continue;
        seenCoordinates.add(coordKey);

        const placeName = item.namedetails?.name || item.name || item.display_name.split(',')[0];
        const formattedAddress = item.display_name;

        let category = 'Landmark / Location';
        if (item.class === 'shop' || item.type === 'commercial') category = 'Shop / Business';
        else if (item.class === 'tourism' || item.type === 'hotel') category = 'Hotel / Venue';
        else if (item.class === 'amenity') category = 'Amenity / Landmark';
        else if (item.class === 'building') category = 'Building / Complex';

        results.push({
          id: `nom_${item.place_id || Math.random().toString(36).substring(2, 8)}`,
          name: placeName,
          formatted_address: formattedAddress,
          latitude: Number(nLat.toFixed(6)),
          longitude: Number(nLon.toFixed(6)),
          type: item.type || 'place',
          category
        });
      }
    }

    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (err: any) {
    console.error('Places search API error:', err);
    return NextResponse.json({ results: [], error: err.message }, { status: 500 });
  }
}

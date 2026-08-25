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

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

    // 1. If Google Places API Key is present in environment, query Google Places FindPlace/TextSearch
    if (googleApiKey && !googleApiKey.includes('your_')) {
      try {
        const gUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(cleanQuery)}&location=${lat},${lon}&radius=50000&key=${googleApiKey}`;
        const gRes = await fetch(gUrl, { next: { revalidate: 3600 } });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.results && Array.isArray(gData.results)) {
            for (const item of gData.results.slice(0, 8)) {
              const pLat = item.geometry?.location?.lat;
              const pLon = item.geometry?.location?.lng;
              if (pLat === undefined || pLon === undefined) continue;

              const coordKey = `${Number(pLat).toFixed(3)},${Number(pLon).toFixed(3)}`;
              if (seenCoordinates.has(coordKey)) continue;
              seenCoordinates.add(coordKey);

              const types = Array.isArray(item.types) ? item.types : [];
              let category = 'Business / Establishment';
              if (types.some((t: string) => ['store', 'shopping_mall', 'clothing_store', 'electronics_store'].includes(t))) category = 'Shop / Store';
              else if (types.some((t: string) => ['photography', 'art_gallery', 'office'].includes(t))) category = 'Studio / Office';
              else if (types.some((t: string) => ['lodging', 'hotel', 'restaurant', 'resort', 'event_venue'].includes(t))) category = 'Hotel / Venue';
              else if (types.some((t: string) => ['place_of_worship', 'tourist_attraction', 'landmark'].includes(t))) category = 'Landmark / Venue';

              results.push({
                id: `gp_${item.place_id || Math.random().toString(36).substring(2, 8)}`,
                name: item.name || cleanQuery,
                formatted_address: item.formatted_address || item.vicinity || item.name,
                latitude: Number(Number(pLat).toFixed(6)),
                longitude: Number(Number(pLon).toFixed(6)),
                type: types[0] || 'establishment',
                category
              });
            }
          }
        }
      } catch (gErr) {
        console.warn('Google Places API fetch error:', gErr);
      }
    }

    // 2. High-Density POI Search via Photon (Komoot OSM Establishments & Shops Engine)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=10&lat=${lat}&lon=${lon}&lang=en`;
      const photonRes = await fetch(photonUrl, {
        headers: { 'User-Agent': 'StudioCore-Establishment-Search/2.0' }
      });

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        if (photonData.features && Array.isArray(photonData.features)) {
          for (const feat of photonData.features) {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates;
            if (!coords || coords.length < 2) continue;

            const pLon = coords[0];
            const pLat = coords[1];
            const coordKey = `${Number(pLat).toFixed(3)},${Number(pLon).toFixed(3)}`;
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
            let category = 'Local Establishment';
            if (['shop', 'supermarket', 'mall', 'boutique', 'commercial'].includes(osmVal)) category = 'Shop / Store';
            else if (['photography', 'studio', 'craft', 'office'].includes(osmVal)) category = 'Studio / Office';
            else if (['hotel', 'guest_house', 'banquet_hall', 'restaurant', 'resort'].includes(osmVal)) category = 'Hotel / Venue';
            else if (['place_of_worship', 'tourism', 'attraction', 'landmark'].includes(osmVal)) category = 'Landmark / Venue';
            else if (['residential', 'building', 'apartments'].includes(osmVal)) category = 'Building / Complex';

            results.push({
              id: `ph_${props.osm_id || Math.random().toString(36).substring(2, 8)}`,
              name: placeName,
              formatted_address: formattedAddress,
              latitude: Number(Number(pLat).toFixed(6)),
              longitude: Number(Number(pLon).toFixed(6)),
              type: osmVal,
              category
            });
          }
        }
      }
    } catch (phErr) {
      console.warn('Photon POI search error:', phErr);
    }

    // 3. Nominatim Extended Indian Address & Business Geocoder
    if (results.length < 5) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=8&addressdetails=1&extratags=1&namedetails=1&countrycodes=in`;
        const nomRes = await fetch(nomUrl, {
          headers: { 'User-Agent': 'StudioCore-Establishment-Search/2.0' }
        });

        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData)) {
            for (const item of nomData) {
              const nLat = parseFloat(item.lat);
              const nLon = parseFloat(item.lon);
              const coordKey = `${nLat.toFixed(3)},${nLon.toFixed(3)}`;
              if (seenCoordinates.has(coordKey)) continue;
              seenCoordinates.add(coordKey);

              const placeName = item.namedetails?.name || item.name || item.display_name.split(',')[0];
              const formattedAddress = item.display_name;

              let category = 'Landmark / Venue';
              if (item.class === 'shop' || item.type === 'commercial') category = 'Shop / Store';
              else if (item.class === 'tourism' || item.type === 'hotel') category = 'Hotel / Venue';
              else if (item.class === 'amenity') category = 'Amenity / Landmark';
              else if (item.class === 'building') category = 'Building / Studio';

              results.push({
                id: `nom_${item.place_id || Math.random().toString(36).substring(2, 8)}`,
                name: placeName,
                formatted_address: formattedAddress,
                latitude: Number(nLat.toFixed(6)),
                longitude: Number(nLon.toFixed(6)),
                type: item.type || 'establishment',
                category
              });
            }
          }
        }
      } catch (nomErr) {
        console.warn('Nominatim geocoder error:', nomErr);
      }
    }

    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (err: any) {
    console.error('Places search API error:', err);
    return NextResponse.json({ results: [], error: err.message }, { status: 500 });
  }
}

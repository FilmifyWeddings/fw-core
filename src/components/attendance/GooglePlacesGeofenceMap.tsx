'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Compass, RefreshCw, Sparkles, Navigation, Layers } from 'lucide-react';
import { reverseGeocodeAddress } from '@/lib/attendance/geo-fence';

interface GooglePlacesGeofenceMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName: string;
  isEditable?: boolean;
  height?: string;
  className?: string;
  onCoordinatesChange?: (lat: number, lng: number, address?: string) => void;
  onRadiusChange?: (radius: number) => void;
}

declare global {
  interface Window {
    google?: any;
    initGoogleMapCallback?: () => void;
  }
}

export default function GooglePlacesGeofenceMap({
  latitude,
  longitude,
  radiusMeters,
  locationName,
  isEditable = true,
  height = '420px',
  className = '',
  onCoordinatesChange,
  onRadiusChange
}: GooglePlacesGeofenceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [mapType, setMapType] = useState<'google' | 'leaflet'>('leaflet');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(locationName || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');

  // Refs for Google Map objects
  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);
  const googleCircleRef = useRef<any>(null);
  const googleAutocompleteRef = useRef<any>(null);

  // Refs for Leaflet Map objects
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const leafletCircleRef = useRef<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Initialize Map (Google Maps or Leaflet Fallback)
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapContainerRef.current) return;

      if (apiKey) {
        try {
          await loadGoogleMapsScript(apiKey);
          if (isMounted && window.google && window.google.maps) {
            initGoogleMap();
            setMapType('google');
            setMapLoaded(true);
            return;
          }
        } catch (e) {
          console.warn('Google Maps script failed to load, falling back to Leaflet:', e);
        }
      }

      // Leaflet fallback
      await initLeafletMap();
      if (isMounted) {
        setMapType('leaflet');
        setMapLoaded(true);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (_) {}
      }
    };
  }, [apiKey]);

  // Load Google Maps Script Helper
  const loadGoogleMapsScript = (key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  };

  // 1. Initialize Google Map
  const initGoogleMap = () => {
    if (!mapContainerRef.current || !window.google) return;

    const center = { lat: latitude || 19.0596, lng: longitude || 72.8295 };

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 16,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] }
      ]
    });

    googleMapRef.current = map;

    // Draggable Marker
    const marker = new window.google.maps.Marker({
      position: center,
      map,
      draggable: isEditable,
      animation: window.google.maps.Animation.DROP,
      title: locationName || 'Studio Geofence'
    });
    googleMarkerRef.current = marker;

    // Geofence Circle
    const circle = new window.google.maps.Circle({
      strokeColor: '#C89435',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: '#C89435',
      fillOpacity: 0.22,
      map,
      center,
      radius: radiusMeters || 150
    });
    googleCircleRef.current = circle;

    // Marker Drag End Listener
    if (isEditable) {
      marker.addListener('dragend', async () => {
        const pos = marker.getPosition();
        if (pos) {
          const newLat = Number(pos.lat().toFixed(6));
          const newLng = Number(pos.lng().toFixed(6));
          circle.setCenter(pos);
          const addr = await reverseGeocodeAddress(newLat, newLng);
          setCurrentAddress(addr);
          if (onCoordinatesChange) onCoordinatesChange(newLat, newLng, addr);
        }
      });

      map.addListener('click', async (e: any) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          circle.setCenter(e.latLng);
          const newLat = Number(e.latLng.lat().toFixed(6));
          const newLng = Number(e.latLng.lng().toFixed(6));
          const addr = await reverseGeocodeAddress(newLat, newLng);
          setCurrentAddress(addr);
          if (onCoordinatesChange) onCoordinatesChange(newLat, newLng, addr);
        }
      });
    }

    // Google Places Autocomplete
    if (searchInputRef.current && window.google.maps.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ['geometry', 'formatted_address', 'name']
      });
      googleAutocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', async () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const loc = place.geometry.location;
          map.setCenter(loc);
          map.setZoom(17);
          marker.setPosition(loc);
          circle.setCenter(loc);

          const newLat = Number(loc.lat().toFixed(6));
          const newLng = Number(loc.lng().toFixed(6));
          const addr = place.formatted_address || (await reverseGeocodeAddress(newLat, newLng));
          setCurrentAddress(addr);
          setSearchQuery(place.name || addr);
          if (onCoordinatesChange) onCoordinatesChange(newLat, newLng, addr);
        }
      });
    }
  };

  // 2. Initialize Leaflet Map (Dual-Mode Fallback)
  const initLeafletMap = async () => {
    if (!mapContainerRef.current) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const L = (await import('leaflet')).default;

    if (leafletMapRef.current) {
      try {
        leafletMapRef.current.remove();
      } catch (_) {}
    }

    const map = L.map(mapContainerRef.current, {
      center: [latitude || 19.0596, longitude || 72.8295],
      zoom: 16,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    leafletMapRef.current = map;

    const goldIcon = L.divIcon({
      className: 'custom-geofence-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(200, 148, 53, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #C89435; border: 3px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">📍</div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = L.marker([latitude || 19.0596, longitude || 72.8295], {
      icon: goldIcon,
      draggable: isEditable
    }).addTo(map);
    leafletMarkerRef.current = marker;

    const circle = L.circle([latitude || 19.0596, longitude || 72.8295], {
      radius: radiusMeters || 150,
      color: '#C89435',
      weight: 2,
      fillColor: '#C89435',
      fillOpacity: 0.2
    }).addTo(map);
    leafletCircleRef.current = circle;

    if (isEditable) {
      marker.on('dragend', async (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        circle.setLatLng([lat, lng]);
        const newLat = Number(lat.toFixed(6));
        const newLng = Number(lng.toFixed(6));
        const addr = await reverseGeocodeAddress(newLat, newLng);
        setCurrentAddress(addr);
        if (onCoordinatesChange) onCoordinatesChange(newLat, newLng, addr);
      });

      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        const newLat = Number(lat.toFixed(6));
        const newLng = Number(lng.toFixed(6));
        const addr = await reverseGeocodeAddress(newLat, newLng);
        setCurrentAddress(addr);
        if (onCoordinatesChange) onCoordinatesChange(newLat, newLng, addr);
      });
    }
  };

  // Update Circle Radius when slider changes
  useEffect(() => {
    if (googleCircleRef.current) {
      googleCircleRef.current.setRadius(radiusMeters);
    }
    if (leafletCircleRef.current) {
      leafletCircleRef.current.setRadius(radiusMeters);
    }
  }, [radiusMeters]);

  // Update Coordinates when props change externally
  useEffect(() => {
    if (googleMarkerRef.current && googleMapRef.current) {
      const pos = { lat: latitude, lng: longitude };
      googleMarkerRef.current.setPosition(pos);
      if (googleCircleRef.current) googleCircleRef.current.setCenter(pos);
    }
    if (leafletMarkerRef.current && leafletMapRef.current) {
      leafletMarkerRef.current.setLatLng([latitude, longitude]);
      if (leafletCircleRef.current) leafletCircleRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Fallback Nominatim search when not using Google Places Autocomplete
  const handleSearchNominatim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
      );
      const data = await res.json();
      setSearchResults(data || []);
    } catch (_) {
    } finally {
      setSearching(false);
    }
  };

  const handleSelectNominatimResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lon], 17);
      if (leafletMarkerRef.current) leafletMarkerRef.current.setLatLng([lat, lon]);
      if (leafletCircleRef.current) leafletCircleRef.current.setLatLng([lat, lon]);
    }
    if (googleMapRef.current) {
      const pos = { lat, lng: lon };
      googleMapRef.current.setCenter(pos);
      if (googleMarkerRef.current) googleMarkerRef.current.setPosition(pos);
      if (googleCircleRef.current) googleCircleRef.current.setCenter(pos);
    }

    setSearchResults([]);
    setSearchQuery(item.display_name.split(',')[0]);
    setCurrentAddress(item.display_name);

    if (onCoordinatesChange) {
      onCoordinatesChange(Number(lat.toFixed(6)), Number(lon.toFixed(6)), item.display_name);
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#E9DFD2] shadow-sm bg-[#1A1816] ${className}`}>
      {/* Top Search Controls */}
      {isEditable && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
          <form onSubmit={handleSearchNominatim} className="relative flex items-center">
            <Search className="w-4 h-4 text-[#8C847B] absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search studio address, landmark, or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-24 py-2.5 bg-white/95 backdrop-blur-md border border-[#E9DFD2] rounded-xl text-xs font-semibold text-[#211B17] placeholder:text-[#99928A] shadow-md focus:outline-none focus:ring-2 focus:ring-[#C89435]"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1.5 px-3 py-1.5 bg-[#C89435] hover:bg-[#B3802B] text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1"
            >
              {searching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>Search</span>}
            </button>
          </form>

          {/* Autocomplete Dropdown (Nominatim Fallback) */}
          {searchResults.length > 0 && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl border border-[#E9DFD2] shadow-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectNominatimResult(item)}
                  className="w-full text-left px-3 py-2 text-[11.5px] hover:bg-[#FAF8F3] transition flex items-start gap-2 text-[#211B17]"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C89435] mt-0.5 flex-shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Viewport Container */}
      <div ref={mapContainerRef} style={{ height }} className="w-full bg-[#1A1816] z-0" />

      {/* Bottom Radius Slider Control Bar */}
      {isEditable && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#E9DFD2] shadow-lg flex items-center justify-between gap-4 pointer-events-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-[#211B17] whitespace-nowrap">
            <Compass className="w-4 h-4 text-[#C89435]" />
            <span>Radar Radius:</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FAF3E6] text-[#8C6D33] text-[11px] font-mono">
              {radiusMeters}m
            </span>
          </div>

          <input
            type="range"
            min="20"
            max="1000"
            step="10"
            value={radiusMeters}
            onChange={(e) => onRadiusChange && onRadiusChange(Number(e.target.value))}
            className="w-full accent-[#C89435] cursor-pointer"
          />

          <div className="text-[10px] font-mono text-[#8C847B] hidden sm:block whitespace-nowrap">
            Lat: {latitude.toFixed(4)} • Lng: {longitude.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
}

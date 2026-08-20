'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Compass, Navigation, Layers, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface GeofenceRadarMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;
  isEditable?: boolean;
  onCoordinatesChange?: (lat: number, lng: number) => void;
  onRadiusChange?: (radius: number) => void;
  // Optional micro-map punch comparison:
  punchLatitude?: number | null;
  punchLongitude?: number | null;
  isPunchVerified?: boolean;
  className?: string;
  height?: string;
}

export default function GeofenceRadarMap({
  latitude,
  longitude,
  radiusMeters,
  locationName = 'Studio Location',
  isEditable = true,
  onCoordinatesChange,
  onRadiusChange,
  punchLatitude,
  punchLongitude,
  isPunchVerified,
  className = '',
  height = '360px'
}: GeofenceRadarMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const studioMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);
  const punchMarkerRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      // Inject Leaflet CSS if not already present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [latitude || 19.0596, longitude || 72.8295],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Dark Matter / Sleek Dark Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Custom pulsing gold studio pin
      const studioIcon = L.divIcon({
        className: 'custom-studio-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-[#C89435]/30 animate-ping"></span>
            <div class="w-7 h-7 rounded-full bg-[#C89435] text-white flex items-center justify-center shadow-lg border-2 border-white font-bold text-xs">
              📍
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const studioMarker = L.marker([latitude || 19.0596, longitude || 72.8295], {
        icon: studioIcon,
        draggable: isEditable
      }).addTo(map);

      studioMarker.bindPopup(`<b>${locationName}</b><br/>Radius: ${radiusMeters}m`);

      if (isEditable) {
        studioMarker.on('dragend', (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          if (onCoordinatesChange) {
            onCoordinatesChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
          }
        });

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          studioMarker.setLatLng([lat, lng]);
          if (radiusCircleRef.current) {
            radiusCircleRef.current.setLatLng([lat, lng]);
          }
          if (onCoordinatesChange) {
            onCoordinatesChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
          }
        });
      }

      // Pulsing Geofence Radar Circle
      const circle = L.circle([latitude || 19.0596, longitude || 72.8295], {
        radius: radiusMeters,
        color: '#C89435',
        fillColor: '#C89435',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '4, 6'
      }).addTo(map);

      // Optional Punch Location Marker (Micro-Map Mode)
      if (punchLatitude && punchLongitude) {
        const isVerified = isPunchVerified ?? true;
        const punchIcon = L.divIcon({
          className: 'custom-punch-pin',
          html: `
            <div class="w-6 h-6 rounded-full ${isVerified ? 'bg-emerald-600' : 'bg-rose-600'} text-white flex items-center justify-center shadow-lg border-2 border-white text-[10px] font-bold">
              ${isVerified ? '✓' : '✕'}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const punchMarker = L.marker([punchLatitude, punchLongitude], { icon: punchIcon }).addTo(map);
        punchMarker.bindPopup(`<b>Employee Punch Location</b><br/>${isVerified ? 'Inside Geofence' : 'Outside Geofence'}`);
        punchMarkerRef.current = punchMarker;

        // Fit bounds to show both studio and punch location
        const group = L.featureGroup([studioMarker, punchMarker, circle]);
        map.fitBounds(group.getBounds().pad(0.2));
      }

      mapInstanceRef.current = map;
      studioMarkerRef.current = studioMarker;
      radiusCircleRef.current = circle;
      setMapLoaded(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map on coordinate or radius prop change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    if (studioMarkerRef.current) {
      studioMarkerRef.current.setLatLng([latitude, longitude]);
    }
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([latitude, longitude]);
      radiusCircleRef.current.setRadius(radiusMeters);
    }
    mapInstanceRef.current.panTo([latitude, longitude]);
  }, [latitude, longitude, radiusMeters, mapLoaded]);

  // OpenStreetMap Nominatim Search
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.error('Nominatim search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 17);
    }
    if (studioMarkerRef.current) {
      studioMarkerRef.current.setLatLng([lat, lon]);
    }
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([lat, lon]);
    }
    if (onCoordinatesChange) {
      onCoordinatesChange(Number(lat.toFixed(6)), Number(lon.toFixed(6)));
    }

    setSearchResults([]);
    setSearchQuery(item.display_name.split(',')[0]);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#E9DFD2] shadow-sm bg-[#1A1816] ${className}`}>
      {/* Top Search & Controls Overlay */}
      {isEditable && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
          <form onSubmit={handleSearchLocation} className="relative flex items-center">
            <Search className="w-4 h-4 text-[#8C847B] absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search studio address, landmark, or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-24 py-2 bg-white/95 backdrop-blur-md border border-[#E9DFD2] rounded-xl text-xs font-semibold text-[#211B17] placeholder:text-[#99928A] shadow-md focus:outline-none focus:ring-2 focus:ring-[#C89435]"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1 px-3 py-1 bg-[#C89435] hover:bg-[#B3802B] text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1"
            >
              {searching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>Search</span>}
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="bg-white/95 backdrop-blur-md rounded-xl border border-[#E9DFD2] shadow-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
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

      {/* Map Container Viewport */}
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
            min="10"
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

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MapPin, Compass, RefreshCw, Crosshair, 
  Layers, Building2, Store, Hotel 
} from 'lucide-react';
import { reverseGeocodeAddress } from '@/lib/attendance/geo-fence';

interface PlaceItem {
  id: string;
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  type: string;
  category: string;
}

interface GeofenceMapPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;
  isEditable?: boolean;
  height?: string;
  className?: string;
  onCoordinatesChange?: (lat: number, lng: number, address?: string, placeName?: string) => void;
  onRadiusChange?: (radius: number) => void;
}

export default function GeofenceMapPicker({
  latitude = 19.0596,
  longitude = 72.8295,
  radiusMeters = 150,
  locationName = 'Studio Location',
  isEditable = true,
  height = '360px',
  className = '',
  onCoordinatesChange,
  onRadiusChange
}: GeofenceMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Primitives-only State (Never use `new Class()` inside useState)
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');
  const [searchQuery, setSearchQuery] = useState(locationName || '');
  const [searchResults, setSearchResults] = useState<PlaceItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');

  // Leaflet Map objects stored strictly in mutable refs (never in state)
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const leafletCircleRef = useRef<any>(null);
  const streetTileLayerRef = useRef<any>(null);
  const satelliteTileLayerRef = useRef<any>(null);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize Leaflet Map inside client-only useEffect
  useEffect(() => {
    let isMounted = true;
    let initTimer: any = null;

    const initMap = async () => {
      try {
        if (!mapContainerRef.current) return;
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (!document.body.contains(mapContainerRef.current)) return;

        // Load Leaflet CSS dynamically if not present
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        const leafletModule = await import('leaflet');
        const L = (leafletModule as any).default || leafletModule;
        if (!L || typeof L.map !== 'function') return;

        if (!isMounted || !mapContainerRef.current) return;
        if (!document.body.contains(mapContainerRef.current)) return;

        // Clean up previous instance if any
        if (leafletMapRef.current) {
          try {
            leafletMapRef.current.off();
            leafletMapRef.current.remove();
          } catch (_) {}
          leafletMapRef.current = null;
        }

        // Clean stale _leaflet_id from DOM element
        if ((mapContainerRef.current as any)._leaflet_id) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }

        const targetLat = Number(latitude) || 19.0596;
        const targetLng = Number(longitude) || 72.8295;

        const map = L.map(mapContainerRef.current, {
          center: [targetLat, targetLng],
          zoom: 16,
          zoomControl: true,
          attributionControl: false
        });

        // Layer 1: CartoDB Voyager / OpenStreetMap Street View
        const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20
        });

        // Layer 2: ESRI World Imagery (High-Res Satellite)
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        });

        streetLayer.addTo(map);
        streetTileLayerRef.current = streetLayer;
        satelliteTileLayerRef.current = satelliteLayer;
        leafletMapRef.current = map;

        // Gold Biometric Pin Marker
        const goldIcon = L.divIcon({
          className: 'custom-geofence-pin',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
              <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(245, 158, 11, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #f59e0b; border: 3px solid #FFFFFF; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">📍</div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = L.marker([targetLat, targetLng], {
          icon: goldIcon,
          draggable: isEditable
        }).addTo(map);
        leafletMarkerRef.current = marker;

        // Radial Geofence Circle
        const circle = L.circle([targetLat, targetLng], {
          radius: Number(radiusMeters) || 50,
          color: '#f59e0b',
          weight: 2.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.25
        }).addTo(map);
        leafletCircleRef.current = circle;

        // Marker Drag & Click Handlers
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

        if (isMounted) setMapLoaded(true);
      } catch (err) {
        console.warn('GeofenceMapPicker safe init notice:', err);
      }
    };

    initTimer = setTimeout(() => {
      initMap();
    }, 120);

    return () => {
      isMounted = false;
      if (initTimer) clearTimeout(initTimer);
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.off();
          leafletMapRef.current.remove();
        } catch (_) {}
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Switch between Street and Satellite Map Layers
  const toggleMapLayer = () => {
    if (!leafletMapRef.current || !streetTileLayerRef.current || !satelliteTileLayerRef.current) return;

    if (mapLayer === 'street') {
      leafletMapRef.current.removeLayer(streetTileLayerRef.current);
      satelliteTileLayerRef.current.addTo(leafletMapRef.current);
      setMapLayer('satellite');
    } else {
      leafletMapRef.current.removeLayer(satelliteTileLayerRef.current);
      streetTileLayerRef.current.addTo(leafletMapRef.current);
      setMapLayer('street');
    }
  };

  // 1-Click "Use My Current Studio Location"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        if (leafletMapRef.current) {
          leafletMapRef.current.flyTo([lat, lng], 18, { duration: 1.2 });
        }
        if (leafletMarkerRef.current) leafletMarkerRef.current.setLatLng([lat, lng]);
        if (leafletCircleRef.current) leafletCircleRef.current.setLatLng([lat, lng]);

        const addr = await reverseGeocodeAddress(lat, lng);
        setCurrentAddress(addr);
        setSearchQuery(addr);

        if (onCoordinatesChange) onCoordinatesChange(lat, lng, addr, 'My Studio Location');
      },
      (err) => {
        setIsLocating(false);
        alert('Could not retrieve GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Nominatim & Places Search with 200ms debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);

    if (!val.trim() || val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchDebounceTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/attendance/places-search?q=${encodeURIComponent(val)}&lat=${latitude || 19.0760}&lon=${longitude || 72.8777}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (_) {
      } finally {
        setSearching(false);
      }
    }, 200);
  };

  // Select Place from Suggestions
  const handleSelectPlace = (item: PlaceItem) => {
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([item.latitude, item.longitude], 17, { duration: 1.2 });
      if (leafletMarkerRef.current) leafletMarkerRef.current.setLatLng([item.latitude, item.longitude]);
      if (leafletCircleRef.current) leafletCircleRef.current.setLatLng([item.latitude, item.longitude]);
    }

    setSearchResults([]);
    setSearchQuery(item.name);
    setCurrentAddress(item.formatted_address);

    if (onCoordinatesChange) {
      onCoordinatesChange(item.latitude, item.longitude, item.formatted_address, item.name);
    }
  };

  // Update Circle Radius when slider changes
  useEffect(() => {
    if (leafletCircleRef.current) {
      leafletCircleRef.current.setRadius(Number(radiusMeters) || 50);
    }
  }, [radiusMeters]);

  // Controller effect: Instantly center map and circle onto saved employee coordinate
  useEffect(() => {
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (latNum && lngNum && !isNaN(latNum) && !isNaN(lngNum)) {
      if (leafletMarkerRef.current) leafletMarkerRef.current.setLatLng([latNum, lngNum]);
      if (leafletCircleRef.current) leafletCircleRef.current.setLatLng([latNum, lngNum]);
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([latNum, lngNum], 16, { animate: false });
        leafletMapRef.current.invalidateSize();
      }
    }
    if (locationName) {
      setSearchQuery(locationName);
    }
  }, [latitude, longitude, locationName, mapLoaded]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#EAE5DA] shadow-xs bg-[#1A1816] ${className}`}>
      {/* Top Search & Control Bar */}
      {isEditable && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-[#8C847B] absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search studio name, shop, venue, landmark..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="w-full pl-9 pr-8 py-2.5 bg-white/95 backdrop-blur-md border border-[#EAE5DA] rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searching && (
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin absolute right-3" />
              )}
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              title="Pinpoint my exact current studio location with GPS"
              className="px-3 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer"
            >
              {isLocating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Crosshair className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">My Location</span>
            </button>

            <button
              type="button"
              onClick={toggleMapLayer}
              title="Switch between Street View and Satellite View"
              className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 border border-[#EAE5DA] rounded-xl shadow-md transition flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span className="text-[11px] font-bold hidden md:inline">
                {mapLayer === 'street' ? 'Satellite' : 'Street'}
              </span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl border border-[#EAE5DA] shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto z-[1001]">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPlace(item)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-amber-50/60 transition flex items-start justify-between gap-2 text-slate-900 cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 overflow-hidden">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      {item.category?.includes('Shop') ? <Store className="w-3.5 h-3.5" /> :
                       item.category?.includes('Hotel') ? <Hotel className="w-3.5 h-3.5" /> :
                       item.category?.includes('Studio') ? <Building2 className="w-3.5 h-3.5" /> :
                       <MapPin className="w-3.5 h-3.5" />}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-xs text-slate-900 block truncate">{item.name}</span>
                      <span className="text-[10.5px] text-slate-500 truncate block">{item.formatted_address}</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap shrink-0 mt-0.5">
                    {item.category || 'Location'}
                  </span>
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
        <div className="p-3.5 bg-white border-t border-[#EAE5DA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 whitespace-nowrap">
            <Compass className="w-4 h-4 text-amber-600" />
            <span>Geofence Radius:</span>
            <span className="font-mono text-amber-900 font-black bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
              {radiusMeters || 50}m
            </span>
          </div>

          <div className="flex-1 max-w-md flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={500}
              step={5}
              value={radiusMeters || 50}
              onChange={(e) => onRadiusChange && onRadiusChange(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex gap-1 text-[10px] font-bold text-slate-400 whitespace-nowrap">
              <span>10m</span>
              <span>•</span>
              <span>50m</span>
              <span>•</span>
              <span>100m</span>
              <span>•</span>
              <span>250m</span>
              <span>•</span>
              <span>500m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

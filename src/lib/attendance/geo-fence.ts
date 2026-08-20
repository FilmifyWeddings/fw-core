/**
 * Geo-Fencing & Haversine Distance Calculation Engine
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceTarget {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface GeofenceValidationResult {
  isWithinGeofence: boolean;
  closestLocation: GeofenceTarget | null;
  nearestLocationName?: string;
  distanceMeters: number;
  allowedRadiusMeters: number;
  message: string;
}

/**
 * Calculates great-circle distance between two points on Earth using the Haversine Formula.
 * Returns distance in exact meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Validates a user's live coordinates against one or more active geofence targets.
 */
export function validateCoordinatesAgainstGeofences(
  userCoords: GeoCoordinates,
  geofences: GeofenceTarget[]
): GeofenceValidationResult {
  if (!geofences || geofences.length === 0) {
    // If no geofences configured, allow punch by default
    return {
      isWithinGeofence: true,
      closestLocation: null,
      distanceMeters: 0,
      allowedRadiusMeters: 150,
      message: 'No active geofence restrictions configured'
    };
  }

  let closestLoc: GeofenceTarget | null = null;
  let minDistance = Infinity;

  for (const gf of geofences) {
    const dist = calculateHaversineDistanceMeters(
      userCoords.latitude,
      userCoords.longitude,
      Number(gf.latitude),
      Number(gf.longitude)
    );

    if (dist < minDistance) {
      minDistance = dist;
      closestLoc = gf;
    }
  }

  if (!closestLoc) {
    return {
      isWithinGeofence: false,
      closestLocation: null,
      distanceMeters: 0,
      allowedRadiusMeters: 100,
      message: 'No location found'
    };
  }

  const allowedRadius = Number(closestLoc.radius_meters) || 150;
  const isWithin = minDistance <= allowedRadius;

  let message = '';
  if (isWithin) {
    message = `Within ${closestLoc.name} (${minDistance}m away, radius: ${allowedRadius}m)`;
  } else {
    const formattedDist =
      minDistance >= 1000
        ? `${(minDistance / 1000).toFixed(1)} km`
        : `${minDistance}m`;
    message = `You are ${formattedDist} away from ${closestLoc.name}. Allowed radius: ${allowedRadius}m.`;
  }

  return {
    isWithinGeofence: isWithin,
    closestLocation: closestLoc,
    nearestLocationName: closestLoc.name,
    distanceMeters: minDistance,
    allowedRadiusMeters: allowedRadius,
    message
  };
}

/**
 * Reverse geocodes coordinates (lat, lng) to a human-readable address with fallbacks.
 */
export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  if (!lat || !lng) return 'Unknown Location';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'StudioCore-Attendance-Engine/1.0'
        },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        // Return clean short address (e.g. "Bandra West, Mumbai")
        const addr = data.address || {};
        const parts = [
          addr.suburb || addr.neighbourhood || addr.road,
          addr.city || addr.town || addr.state_district,
          addr.state
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');
      }
    }
  } catch (_) {
    // Fallback gracefully to coordinate string
  }

  return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
}

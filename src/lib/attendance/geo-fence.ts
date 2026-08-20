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
    distanceMeters: minDistance,
    allowedRadiusMeters: allowedRadius,
    message
  };
}

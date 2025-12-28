/**
 * Shared geographic utilities for distance, bearing, and direction calculations.
 * Consolidates duplicated geo logic from multiple files into a single source of truth.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula.
 * @returns Distance in meters
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate the bearing from one coordinate to another.
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Convert a bearing to a compass direction.
 */
export function bearingToCompassDirection(bearing: number): string {
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Convert a bearing to a relative direction based on device heading.
 */
export function bearingToRelativeDirection(bearing: number, heading?: number): string {
  if (heading === undefined) {
    return bearingToCompassDirection(bearing);
  }

  const relativeBearing = (bearing - heading + 360) % 360;

  if (relativeBearing < 30 || relativeBearing > 330) return 'straight ahead';
  if (relativeBearing >= 30 && relativeBearing < 60) return 'slightly right';
  if (relativeBearing >= 60 && relativeBearing < 120) return 'turn right';
  if (relativeBearing >= 120 && relativeBearing < 150) return 'turn sharply right';
  if (relativeBearing >= 150 && relativeBearing < 210) return 'behind you';
  if (relativeBearing >= 210 && relativeBearing < 240) return 'turn sharply left';
  if (relativeBearing >= 240 && relativeBearing < 300) return 'turn left';
  return 'slightly left';
}

/**
 * Format distance for display.
 */
export function formatDistance(meters: number): string {
  if (meters < 10) return 'less than 10 meters';
  if (meters < 50) return `about ${Math.round(meters / 5) * 5} meters`;
  if (meters < 100) return `about ${Math.round(meters / 10) * 10} meters`;
  if (meters < 1000) return `about ${Math.round(meters / 50) * 50} meters`;
  return `about ${(meters / 1000).toFixed(1)} kilometers`;
}

/**
 * Format distance for compact display.
 */
export function formatDistanceCompact(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Check if a coordinate is within a radius of another coordinate.
 */
export function isWithinRadius(from: Coordinates, to: Coordinates, radiusMeters: number): boolean {
  return calculateDistance(from, to) <= radiusMeters;
}

/**
 * Validate GPS coordinates.
 */
export function isValidCoordinate(coord: Coordinates): boolean {
  return (
    typeof coord.lat === 'number' &&
    typeof coord.lng === 'number' &&
    !isNaN(coord.lat) &&
    !isNaN(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}

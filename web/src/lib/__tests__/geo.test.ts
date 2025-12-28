import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  calculateBearing,
  bearingToCompassDirection,
  formatDistance,
  formatDistanceCompact,
} from '../geo';

describe('calculateDistance', () => {
  it('should return 0 for same coordinates', () => {
    const coord = { lat: 40.7128, lng: -74.006 };
    expect(calculateDistance(coord, coord)).toBe(0);
  });

  it('should calculate short distances accurately', () => {
    // Two points about 1km apart in NYC
    const from = { lat: 40.7128, lng: -74.006 };
    const to = { lat: 40.7218, lng: -74.006 };
    const distance = calculateDistance(from, to);

    // Should be approximately 1km (within 50m tolerance)
    expect(distance).toBeGreaterThan(950);
    expect(distance).toBeLessThan(1050);
  });

  it('should calculate medium distances accurately', () => {
    // NYC to Boston (~340km)
    const nyc = { lat: 40.7128, lng: -74.006 };
    const boston = { lat: 42.3601, lng: -71.0589 };
    const distance = calculateDistance(nyc, boston);

    // Should be approximately 306km
    expect(distance).toBeGreaterThan(300000);
    expect(distance).toBeLessThan(320000);
  });

  it('should calculate long distances accurately', () => {
    // NYC to London (~5500km)
    const nyc = { lat: 40.7128, lng: -74.006 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const distance = calculateDistance(nyc, london);

    // Should be approximately 5570km
    expect(distance).toBeGreaterThan(5500000);
    expect(distance).toBeLessThan(5650000);
  });

  it('should handle crossing the equator', () => {
    const north = { lat: 10, lng: 0 };
    const south = { lat: -10, lng: 0 };
    const distance = calculateDistance(north, south);

    // 20 degrees latitude ≈ 2220km
    expect(distance).toBeGreaterThan(2200000);
    expect(distance).toBeLessThan(2250000);
  });

  it('should handle crossing the prime meridian', () => {
    const west = { lat: 51.5, lng: -1 };
    const east = { lat: 51.5, lng: 1 };
    const distance = calculateDistance(west, east);

    // Should be ~140km at latitude 51.5
    expect(distance).toBeGreaterThan(130000);
    expect(distance).toBeLessThan(150000);
  });

  it('should be symmetric', () => {
    const a = { lat: 40.7128, lng: -74.006 };
    const b = { lat: 42.3601, lng: -71.0589 };

    expect(calculateDistance(a, b)).toBeCloseTo(calculateDistance(b, a), 5);
  });
});

describe('calculateBearing', () => {
  it('should return 0 for due north', () => {
    const from = { lat: 40, lng: -74 };
    const to = { lat: 41, lng: -74 };
    const bearing = calculateBearing(from, to);

    expect(bearing).toBeCloseTo(0, 0);
  });

  it('should return 90 for due east', () => {
    const from = { lat: 40, lng: -74 };
    const to = { lat: 40, lng: -73 };
    const bearing = calculateBearing(from, to);

    expect(bearing).toBeCloseTo(90, 0);
  });

  it('should return 180 for due south', () => {
    const from = { lat: 41, lng: -74 };
    const to = { lat: 40, lng: -74 };
    const bearing = calculateBearing(from, to);

    expect(bearing).toBeCloseTo(180, 0);
  });

  it('should return 270 for due west', () => {
    const from = { lat: 40, lng: -73 };
    const to = { lat: 40, lng: -74 };
    const bearing = calculateBearing(from, to);

    expect(bearing).toBeCloseTo(270, 0);
  });

  it('should return value between 0 and 360', () => {
    const testCases = [
      { from: { lat: 0, lng: 0 }, to: { lat: 10, lng: 10 } },
      { from: { lat: 50, lng: -120 }, to: { lat: -30, lng: 45 } },
      { from: { lat: -45, lng: 170 }, to: { lat: 45, lng: -170 } },
    ];

    testCases.forEach(({ from, to }) => {
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });
  });
});

describe('bearingToCompassDirection', () => {
  it('should return north for 0 degrees', () => {
    expect(bearingToCompassDirection(0)).toBe('north');
  });

  it('should return north for 360 degrees (wrapping)', () => {
    expect(bearingToCompassDirection(360)).toBe('north');
  });

  it('should return northeast for 45 degrees', () => {
    expect(bearingToCompassDirection(45)).toBe('northeast');
  });

  it('should return east for 90 degrees', () => {
    expect(bearingToCompassDirection(90)).toBe('east');
  });

  it('should return southeast for 135 degrees', () => {
    expect(bearingToCompassDirection(135)).toBe('southeast');
  });

  it('should return south for 180 degrees', () => {
    expect(bearingToCompassDirection(180)).toBe('south');
  });

  it('should return southwest for 225 degrees', () => {
    expect(bearingToCompassDirection(225)).toBe('southwest');
  });

  it('should return west for 270 degrees', () => {
    expect(bearingToCompassDirection(270)).toBe('west');
  });

  it('should return northwest for 315 degrees', () => {
    expect(bearingToCompassDirection(315)).toBe('northwest');
  });

  it('should round to nearest direction', () => {
    expect(bearingToCompassDirection(22)).toBe('north');
    expect(bearingToCompassDirection(23)).toBe('northeast');
    expect(bearingToCompassDirection(68)).toBe('east'); // 67.5 is the boundary
  });
});

describe('formatDistance', () => {
  it('should format very short distances', () => {
    expect(formatDistance(5)).toBe('less than 10 meters');
    expect(formatDistance(9)).toBe('less than 10 meters');
  });

  it('should round short distances to 5 meters', () => {
    expect(formatDistance(12)).toBe('about 10 meters');
    expect(formatDistance(18)).toBe('about 20 meters');
    expect(formatDistance(33)).toBe('about 35 meters');
    expect(formatDistance(47)).toBe('about 45 meters');
  });

  it('should round medium distances to 10 meters', () => {
    expect(formatDistance(55)).toBe('about 60 meters');
    expect(formatDistance(84)).toBe('about 80 meters');
    expect(formatDistance(95)).toBe('about 100 meters');
  });

  it('should round longer distances to 50 meters', () => {
    expect(formatDistance(125)).toBe('about 150 meters');
    expect(formatDistance(475)).toBe('about 500 meters');
    expect(formatDistance(680)).toBe('about 700 meters');
  });

  it('should format distances in kilometers', () => {
    expect(formatDistance(1000)).toBe('about 1.0 kilometers');
    expect(formatDistance(1500)).toBe('about 1.5 kilometers');
    expect(formatDistance(2750)).toBe('about 2.8 kilometers');
    expect(formatDistance(10000)).toBe('about 10.0 kilometers');
  });
});

describe('formatDistanceCompact', () => {
  it('should format meters without decimals', () => {
    expect(formatDistanceCompact(50)).toBe('50m');
    expect(formatDistanceCompact(123)).toBe('123m');
    expect(formatDistanceCompact(999)).toBe('999m');
  });

  it('should format kilometers with one decimal', () => {
    expect(formatDistanceCompact(1000)).toBe('1.0km');
    expect(formatDistanceCompact(1500)).toBe('1.5km');
    expect(formatDistanceCompact(12345)).toBe('12.3km');
  });

  it('should round meters correctly', () => {
    expect(formatDistanceCompact(50.4)).toBe('50m');
    expect(formatDistanceCompact(50.6)).toBe('51m');
  });
});

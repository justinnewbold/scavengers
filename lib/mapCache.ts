import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAP_CACHE_DIR = `${FileSystem.cacheDirectory}map_tiles/`;
const CACHE_INDEX_KEY = 'map_cache_index';
const MAX_CACHE_SIZE_MB = 100; // Maximum cache size in MB
const TILE_EXPIRY_DAYS = 30;

interface TileInfo {
  url: string;
  localPath: string;
  size: number;
  downloadedAt: number;
  lastAccessedAt: number;
  z: number;
  x: number;
  y: number;
}

interface CacheIndex {
  tiles: Record<string, TileInfo>;
  totalSize: number;
  lastCleanup: number;
}

interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

type ProgressCallback = (progress: DownloadProgress) => void;

// Tile URL template for OpenStreetMap
const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Convert latitude/longitude to tile coordinates
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/**
 * Get all tile coordinates for a bounding box at a given zoom level
 */
function getTilesInBounds(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
  zoom: number
): Array<{ x: number; y: number; z: number }> {
  const tiles: Array<{ x: number; y: number; z: number }> = [];

  const min = latLngToTile(maxLat, minLng, zoom); // Note: max lat = min y
  const max = latLngToTile(minLat, maxLng, zoom);

  for (let x = min.x; x <= max.x; x++) {
    for (let y = min.y; y <= max.y; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }

  return tiles;
}

/**
 * Generate tile key for cache index
 */
function getTileKey(z: number, x: number, y: number): string {
  return `${z}/${x}/${y}`;
}

/**
 * Get tile URL
 */
function getTileUrl(z: number, x: number, y: number): string {
  return TILE_URL_TEMPLATE.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

/**
 * Load cache index from storage
 */
async function loadCacheIndex(): Promise<CacheIndex> {
  try {
    const stored = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load cache index:', error);
  }

  return {
    tiles: {},
    totalSize: 0,
    lastCleanup: Date.now(),
  };
}

/**
 * Save cache index to storage
 */
async function saveCacheIndex(index: CacheIndex): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('Failed to save cache index:', error);
  }
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MAP_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MAP_CACHE_DIR, { intermediates: true });
  }
}

/**
 * Download a single tile
 */
async function downloadTile(z: number, x: number, y: number): Promise<TileInfo | null> {
  const url = getTileUrl(z, x, y);
  const key = getTileKey(z, x, y);
  const localPath = `${MAP_CACHE_DIR}${key.replace(/\//g, '_')}.png`;

  try {
    await ensureCacheDir();

    const downloadResult = await FileSystem.downloadAsync(url, localPath, {
      headers: {
        'User-Agent': 'ScavengersApp/1.0',
      },
    });

    if (downloadResult.status !== 200) {
      console.error(`Failed to download tile ${key}: ${downloadResult.status}`);
      return null;
    }

    const fileInfo = await FileSystem.getInfoAsync(localPath);
    const size = (fileInfo as { size?: number }).size || 0;

    return {
      url,
      localPath,
      size,
      downloadedAt: Date.now(),
      lastAccessedAt: Date.now(),
      z,
      x,
      y,
    };
  } catch (error) {
    console.error(`Failed to download tile ${key}:`, error);
    return null;
  }
}

/**
 * Get a tile from cache or download it
 */
export async function getTile(z: number, x: number, y: number): Promise<string | null> {
  const key = getTileKey(z, x, y);
  const index = await loadCacheIndex();

  if (index.tiles[key]) {
    const tile = index.tiles[key];
    const fileInfo = await FileSystem.getInfoAsync(tile.localPath);

    if (fileInfo.exists) {
      // Update last accessed time
      tile.lastAccessedAt = Date.now();
      await saveCacheIndex(index);
      return tile.localPath;
    }
  }

  // Download tile
  const tileInfo = await downloadTile(z, x, y);
  if (tileInfo) {
    index.tiles[key] = tileInfo;
    index.totalSize += tileInfo.size;
    await saveCacheIndex(index);
    return tileInfo.localPath;
  }

  return null;
}

/**
 * Pre-download tiles for a hunt area
 */
export async function downloadAreaTiles(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  zoomLevels: number[] = [14, 15, 16],
  onProgress?: ProgressCallback
): Promise<{ success: number; failed: number; skipped: number }> {
  // Calculate bounding box
  const latDelta = radiusKm / 111; // ~111km per degree latitude
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));

  const minLat = centerLat - latDelta;
  const maxLat = centerLat + latDelta;
  const minLng = centerLng - lngDelta;
  const maxLng = centerLng + lngDelta;

  // Get all tiles needed
  const allTiles: Array<{ x: number; y: number; z: number }> = [];
  for (const zoom of zoomLevels) {
    allTiles.push(...getTilesInBounds(minLat, minLng, maxLat, maxLng, zoom));
  }

  const index = await loadCacheIndex();
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < allTiles.length; i++) {
    const tile = allTiles[i];
    const key = getTileKey(tile.z, tile.x, tile.y);

    // Check if already cached
    if (index.tiles[key]) {
      const fileInfo = await FileSystem.getInfoAsync(index.tiles[key].localPath);
      if (fileInfo.exists) {
        skipped++;
        if (onProgress) {
          onProgress({
            downloaded: i + 1,
            total: allTiles.length,
            percentage: ((i + 1) / allTiles.length) * 100,
          });
        }
        continue;
      }
    }

    // Check cache size
    if (index.totalSize > MAX_CACHE_SIZE_MB * 1024 * 1024) {
      await cleanupCache(index);
    }

    // Download tile
    const tileInfo = await downloadTile(tile.z, tile.x, tile.y);
    if (tileInfo) {
      index.tiles[key] = tileInfo;
      index.totalSize += tileInfo.size;
      success++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress({
        downloaded: i + 1,
        total: allTiles.length,
        percentage: ((i + 1) / allTiles.length) * 100,
      });
    }
  }

  await saveCacheIndex(index);

  return { success, failed, skipped };
}

/**
 * Clean up old/unused tiles
 */
async function cleanupCache(index: CacheIndex): Promise<void> {
  const now = Date.now();
  const expiryTime = TILE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  // Sort tiles by last accessed time
  const sortedTiles = Object.entries(index.tiles)
    .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);

  // Remove oldest tiles until under limit
  const targetSize = MAX_CACHE_SIZE_MB * 1024 * 1024 * 0.8; // 80% of max

  for (const [key, tile] of sortedTiles) {
    if (index.totalSize <= targetSize) break;

    // Always remove expired tiles
    const isExpired = now - tile.downloadedAt > expiryTime;

    if (isExpired || index.totalSize > targetSize) {
      try {
        await FileSystem.deleteAsync(tile.localPath, { idempotent: true });
        index.totalSize -= tile.size;
        delete index.tiles[key];
      } catch (error) {
        console.error(`Failed to delete tile ${key}:`, error);
      }
    }
  }

  index.lastCleanup = now;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  tileCount: number;
  totalSizeMB: number;
  maxSizeMB: number;
  percentUsed: number;
}> {
  const index = await loadCacheIndex();
  const totalSizeMB = index.totalSize / (1024 * 1024);

  return {
    tileCount: Object.keys(index.tiles).length,
    totalSizeMB: Math.round(totalSizeMB * 100) / 100,
    maxSizeMB: MAX_CACHE_SIZE_MB,
    percentUsed: Math.round((totalSizeMB / MAX_CACHE_SIZE_MB) * 100),
  };
}

/**
 * Clear all cached tiles
 */
export async function clearMapCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(MAP_CACHE_DIR, { idempotent: true });
    await AsyncStorage.removeItem(CACHE_INDEX_KEY);
  } catch (error) {
    console.error('Failed to clear map cache:', error);
  }
}

/**
 * Download tiles for a specific hunt
 */
export async function downloadHuntTiles(
  challenges: Array<{ location?: { lat: number; lng: number } }>,
  onProgress?: ProgressCallback
): Promise<{ success: number; failed: number; skipped: number }> {
  // Get all unique locations
  const locations = challenges
    .filter(c => c.location)
    .map(c => c.location!);

  if (locations.length === 0) {
    return { success: 0, failed: 0, skipped: 0 };
  }

  // Calculate center and radius
  const lats = locations.map(l => l.lat);
  const lngs = locations.map(l => l.lng);

  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

  // Calculate radius with padding
  const latRange = Math.max(...lats) - Math.min(...lats);
  const lngRange = Math.max(...lngs) - Math.min(...lngs);
  const radiusKm = Math.max(latRange * 111, lngRange * 111 * Math.cos((centerLat * Math.PI) / 180)) / 2 + 0.5;

  return downloadAreaTiles(centerLat, centerLng, Math.max(radiusKm, 1), [14, 15, 16, 17], onProgress);
}

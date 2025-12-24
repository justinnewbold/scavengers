import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  formatFileSize,
  estimateCompressedSize,
  dataURLToBlob,
} from '../imageUtils';

describe('validateImageFile', () => {
  it('should accept valid image types', () => {
    const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(jpegFile)).toEqual({ valid: true });

    const pngFile = new File([''], 'test.png', { type: 'image/png' });
    expect(validateImageFile(pngFile)).toEqual({ valid: true });

    const gifFile = new File([''], 'test.gif', { type: 'image/gif' });
    expect(validateImageFile(gifFile)).toEqual({ valid: true });

    const webpFile = new File([''], 'test.webp', { type: 'image/webp' });
    expect(validateImageFile(webpFile)).toEqual({ valid: true });
  });

  it('should reject invalid image types', () => {
    const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
    const result = validateImageFile(pdfFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('should reject files exceeding size limit', () => {
    // Create a file larger than 10MB
    const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
    const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

    const result = validateImageFile(largeFile, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('should accept files within size limit', () => {
    const smallContent = new Array(1024).fill('a').join('');
    const smallFile = new File([smallContent], 'small.jpg', { type: 'image/jpeg' });

    expect(validateImageFile(smallFile, 10)).toEqual({ valid: true });
  });

  it('should use custom size limit', () => {
    const content = new Array(6 * 1024 * 1024).fill('a').join('');
    const file = new File([content], 'test.jpg', { type: 'image/jpeg' });

    expect(validateImageFile(file, 5).valid).toBe(false);
    expect(validateImageFile(file, 10).valid).toBe(true);
  });
});

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('should format kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });
});

describe('estimateCompressedSize', () => {
  it('should estimate compression with default quality', () => {
    const original = 1000000; // 1MB
    const estimated = estimateCompressedSize(original);
    expect(estimated).toBeLessThan(original);
    expect(estimated).toBeGreaterThan(0);
  });

  it('should vary estimate based on quality', () => {
    const original = 1000000;
    const highQuality = estimateCompressedSize(original, 0.9);
    const lowQuality = estimateCompressedSize(original, 0.5);

    expect(highQuality).toBeGreaterThan(lowQuality);
  });
});

describe('dataURLToBlob', () => {
  it('should convert data URL to blob', () => {
    const dataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const blob = dataURLToBlob(dataURL);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });

  it('should handle PNG data URLs', () => {
    const dataURL = 'data:image/png;base64,iVBORw0KGgo=';
    const blob = dataURLToBlob(dataURL);

    expect(blob.type).toBe('image/png');
  });
});

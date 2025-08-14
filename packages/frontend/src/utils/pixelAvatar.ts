/**
 * Generates a simple pixel avatar based on a username
 * Creates a deterministic 8x8 pixel pattern with colors based on the username
 */

// Color palette for avatars
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
  '#A3E4D7', '#F9E79F', '#D5A6BD', '#AED6F1', '#A9DFBF'
];

// Simple hash function to convert string to number
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Generate a deterministic pattern based on username
function generatePattern(username: string): boolean[][] {
  const hash = hashCode(username);
  const pattern: boolean[][] = [];
  
  // Create 8x8 grid
  for (let y = 0; y < 8; y++) {
    pattern[y] = [];
    for (let x = 0; x < 8; x++) {
      // Use different parts of the hash for different positions
      const seed = hash + (y * 8 + x) * 7;
      pattern[y][x] = (seed % 3) === 0; // Roughly 1/3 chance of being filled
    }
  }
  
  // Make it symmetrical for better aesthetics
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      pattern[y][7 - x] = pattern[y][x];
    }
  }
  
  return pattern;
}

// Generate pixel avatar as SVG
export function generatePixelAvatar(username: string, size: number = 64): string {
  const pattern = generatePattern(username);
  const hash = hashCode(username);
  
  // Select colors based on username
  const bgColor = COLORS[hash % COLORS.length];
  const pixelColor = COLORS[(hash + 7) % COLORS.length];
  
  const pixelSize = size / 8;
  
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="${bgColor}"/>`;
  
  // Draw pixels
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (pattern[y][x]) {
        const px = x * pixelSize;
        const py = y * pixelSize;
        svg += `<rect x="${px}" y="${py}" width="${pixelSize}" height="${pixelSize}" fill="${pixelColor}"/>`;
      }
    }
  }
  
  svg += '</svg>';
  return svg;
}

// Generate pixel avatar as data URL
export function generatePixelAvatarDataUrl(username: string, size: number = 64): string {
  const svg = generatePixelAvatar(username, size);
  const encoded = btoa(svg);
  return `data:image/svg+xml;base64,${encoded}`;
}

// Generate pixel avatar as blob URL (for better performance with many avatars)
export function generatePixelAvatarBlobUrl(username: string, size: number = 64): string {
  const svg = generatePixelAvatar(username, size);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  return URL.createObjectURL(blob);
}

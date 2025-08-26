/**
 * Utility functions for semantic version handling
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  isUnreleased: boolean;
  original: string;
}

/**
 * Parse a version string into components
 */
export function parseVersion(version: string): ParsedVersion {
  // Handle special case for "Unreleased"
  if (version.toLowerCase() === 'unreleased') {
    return {
      major: Infinity,
      minor: 0,
      patch: 0,
      isUnreleased: true,
      original: version,
    };
  }

  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/, '');
  
  // Match semantic version pattern: major.minor.patch[-prerelease]
  const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  
  if (!match) {
    // If it doesn't match semantic versioning, treat as a simple string
    // This handles cases like "2.1.0" vs "2.0.5" properly
    const parts = cleanVersion.split('.');
    return {
      major: parseInt(parts[0] || '0', 10),
      minor: parseInt(parts[1] || '0', 10),
      patch: parseInt(parts[2] || '0', 10),
      prerelease: undefined,
      isUnreleased: false,
      original: version,
    };
  }

  const [, major, minor, patch, prerelease] = match;
  
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease,
    isUnreleased: false,
    original: version,
  };
}

/**
 * Compare two version strings using semantic versioning rules
 * Returns:
 * - negative number if a < b
 * - positive number if a > b  
 * - 0 if a === b
 */
export function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  // Unreleased always comes first (highest priority)
  if (versionA.isUnreleased && !versionB.isUnreleased) return -1;
  if (!versionA.isUnreleased && versionB.isUnreleased) return 1;
  if (versionA.isUnreleased && versionB.isUnreleased) return 0;

  // Compare major version
  if (versionA.major !== versionB.major) {
    return versionB.major - versionA.major; // Descending order (newer first)
  }

  // Compare minor version
  if (versionA.minor !== versionB.minor) {
    return versionB.minor - versionA.minor; // Descending order (newer first)
  }

  // Compare patch version
  if (versionA.patch !== versionB.patch) {
    return versionB.patch - versionA.patch; // Descending order (newer first)
  }

  // Handle prerelease versions
  if (versionA.prerelease && !versionB.prerelease) return 1; // Prerelease comes after release
  if (!versionA.prerelease && versionB.prerelease) return -1; // Release comes before prerelease
  if (versionA.prerelease && versionB.prerelease) {
    return versionA.prerelease.localeCompare(versionB.prerelease);
  }

  return 0; // Versions are equal
}

/**
 * Sort an array of version strings in descending order (newest first)
 */
export function sortVersionsDescending(versions: string[]): string[] {
  return [...versions].sort(compareVersions);
}

/**
 * Sort an array of objects by their version property in descending order (newest first)
 */
export function sortByVersionDescending<T extends { version: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareVersions(a.version, b.version));
}

/**
 * Check if a version string is valid semantic version
 */
export function isValidSemanticVersion(version: string): boolean {
  if (version.toLowerCase() === 'unreleased') return true;
  
  const cleanVersion = version.replace(/^v/, '');
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
  return semverRegex.test(cleanVersion);
}

/**
 * Get the next version number based on increment type
 */
export function getNextVersion(currentVersion: string, incrementType: 'major' | 'minor' | 'patch' = 'patch'): string {
  const parsed = parseVersion(currentVersion);
  
  if (parsed.isUnreleased) {
    return 'v1.0.0'; // Default first version
  }

  let { major, minor, patch } = parsed;

  switch (incrementType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
  }

  return `v${major}.${minor}.${patch}`;
}

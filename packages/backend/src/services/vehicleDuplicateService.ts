import { db } from '../db';
import { vehicles, users } from '../db/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Calculate Levenshtein distance between two strings for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Check if two strings are similar enough (fuzzy match)
 */
function isSimilarString(str1: string, str2: string, threshold: number = 0.8): boolean {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return true;

  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return true;

  const distance = levenshteinDistance(s1, s2);
  const similarity = 1 - (distance / maxLength);

  return similarity >= threshold;
}

export interface VehicleData {
  make: string;
  model: string;
  year: number;
  batteryCapacity?: number;
  range?: number;
  chargingSpeed?: number;
  description?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingVehicle?: any;
  suggestions?: string[];
  message?: string;
}

/**
 * Check if a vehicle with the same identifying characteristics already exists
 * Primary identifiers: make, model, year (case-insensitive)
 */
export async function checkForDuplicate(vehicleData: VehicleData): Promise<DuplicateCheckResult> {
  const { make, model, year, batteryCapacity, range, chargingSpeed } = vehicleData;

  try {
    // Get all vehicles and do case-insensitive comparison in JavaScript
    // This avoids potential SQL compatibility issues
    const allVehicles = await db.select().from(vehicles);

    // Find vehicles with matching make, model, and similar year
    // Use both exact and fuzzy matching to catch typos and variations
    const existingVehicles = allVehicles.filter(vehicle => {
      // Exact match (case-insensitive)
      const exactMakeMatch = vehicle.make.toLowerCase().trim() === make.toLowerCase().trim();
      const exactModelMatch = vehicle.model.toLowerCase().trim() === model.toLowerCase().trim();

      // Fuzzy match for typos (80% similarity threshold)
      const fuzzyMakeMatch = isSimilarString(vehicle.make, make, 0.80);
      const fuzzyModelMatch = isSimilarString(vehicle.model, model, 0.80);

      const makeMatch = exactMakeMatch || fuzzyMakeMatch;
      const modelMatch = exactModelMatch || fuzzyModelMatch;
      const yearMatch = Math.abs(vehicle.year - year) <= 2; // Allow ±2 years difference



      return makeMatch && modelMatch && yearMatch;
    });



    if (existingVehicles.length === 0) {
      // No duplicates found
      return { isDuplicate: false };
    }

    // Check for exact specification matches
    const exactMatch = existingVehicles.find(existing =>
      existing.batteryCapacity === batteryCapacity &&
      existing.range === range &&
      existing.chargingSpeed === chargingSpeed
    );

    if (exactMatch) {
      // Exact duplicate found
      return {
        isDuplicate: true,
        existingVehicle: exactMatch,
        message: `A ${year} ${make} ${model} with identical specifications already exists in the database.`
      };
    }

    // Check for very similar specifications (likely the same variant)
    const verySimilarMatch = existingVehicles.find(existing => {
      const batteryTolerance = batteryCapacity && existing.batteryCapacity ? Math.abs(existing.batteryCapacity - batteryCapacity) <= (batteryCapacity * 0.05) : false; // ±5%
      const rangeTolerance = range && existing.range ? Math.abs(existing.range - range) <= 25 : false; // ±25 km
      const chargingTolerance = chargingSpeed && existing.chargingSpeed ? Math.abs(existing.chargingSpeed - chargingSpeed) <= 10 : false; // ±10 kW

      return batteryTolerance && rangeTolerance && chargingTolerance;
    });

    if (verySimilarMatch) {
      // Very similar vehicle found - likely the same variant with minor spec differences
      return {
        isDuplicate: true,
        existingVehicle: verySimilarMatch,
        message: `A very similar ${year} ${make} ${model} already exists with nearly identical specifications. Please verify this is a different variant.`
      };
    }

    // Similar vehicle exists but with different specs - suggest variants
    const suggestions = generateVariantSuggestions(vehicleData, existingVehicles);


    return {
      isDuplicate: true,
      existingVehicle: existingVehicles[0], // Return first match for reference
      suggestions,
      message: `A ${year} ${make} ${model} already exists. Consider creating a variant with different specifications.`
    };

  } catch (error) {
    // In case of error, allow the submission to proceed
    return { isDuplicate: false };
  }
}

/**
 * Generate suggestions for creating vehicle variants
 */
function generateVariantSuggestions(newVehicle: VehicleData, existingVehicles: any[]): string[] {
  const suggestions: string[] = [];
  const { make, model, year } = newVehicle;

  // Analyze existing vehicles to suggest what could be different
  const existingSpecs = existingVehicles.map(v => ({
    batteryCapacity: v.batteryCapacity,
    range: v.range,
    chargingSpeed: v.chargingSpeed,
    description: v.description
  }));

  // Suggest trim levels if description is not provided or generic
  if (!newVehicle.description || newVehicle.description.trim().length === 0) {
    suggestions.push(`Add a specific trim level or variant name (e.g., "${make} ${model} Performance", "${make} ${model} Long Range", "${make} ${model} Standard")`);
  }

  // Suggest different battery capacity
  if (newVehicle.batteryCapacity) {
    const existingCapacities = existingSpecs.map(s => s.batteryCapacity).filter(Boolean);
    if (existingCapacities.includes(newVehicle.batteryCapacity)) {
      suggestions.push('Try a different battery capacity (kWh) to differentiate this variant');
    }
  } else {
    suggestions.push('Add a specific battery capacity (kWh) to differentiate this variant');
  }

  // Suggest different range
  if (newVehicle.range) {
    const existingRanges = existingSpecs.map(s => s.range).filter(Boolean);
    if (existingRanges.includes(newVehicle.range)) {
      suggestions.push('Try a different range (km) to differentiate this variant');
    }
  } else {
    suggestions.push('Add a specific range (km) to differentiate this variant');
  }

  // Suggest different charging speed
  if (newVehicle.chargingSpeed) {
    const existingChargingSpeeds = existingSpecs.map(s => s.chargingSpeed).filter(Boolean);
    if (existingChargingSpeeds.includes(newVehicle.chargingSpeed)) {
      suggestions.push('Try a different charging speed (kW) to differentiate this variant');
    }
  } else {
    suggestions.push('Add a specific charging speed (kW) to differentiate this variant');
  }

  // If no specific suggestions, provide general guidance
  if (suggestions.length === 0) {
    suggestions.push(`Consider adding more specific details like trim level, battery size, or performance specifications to create a distinct variant of the ${year} ${make} ${model}`);
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions to avoid overwhelming the user
}

/**
 * Check if the current user has sufficient credits and deduct if they do
 * Returns true if successful, false if insufficient credits
 */
export async function deductContributionCredit(userId: number, userRole: string): Promise<boolean> {
  // Admins and moderators don't consume credits
  if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
    return true;
  }

  try {
    // Get current user balance
    const [user] = await db
      .select({ appCurrencyBalance: users.appCurrencyBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.error('User not found for credit deduction:', userId);
      return false;
    }

    if (user.appCurrencyBalance <= 0) {
      return false; // Insufficient credits
    }

    // Deduct 1 credit
    await db
      .update(users)
      .set({ appCurrencyBalance: user.appCurrencyBalance - 1 })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error('Error deducting contribution credit:', error);
    return false;
  }
}

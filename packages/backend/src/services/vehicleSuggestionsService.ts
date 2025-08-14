import { db } from '../db';
import { vehicles } from '../db/schema';
import { sql } from 'drizzle-orm';

export interface VehicleSuggestions {
  makes: string[];
  models: string[];
  modelsByMake: Record<string, string[]>;
}

/**
 * Get unique makes and models from existing vehicles for autocomplete suggestions
 */
export async function getVehicleSuggestions(): Promise<VehicleSuggestions> {
  try {
    // Get all vehicles to extract unique makes and models
    const allVehicles = await db.select({
      make: vehicles.make,
      model: vehicles.model
    }).from(vehicles);

    // Extract unique makes (case-insensitive, sorted)
    const makesSet = new Set<string>();
    const modelsByMake: Record<string, Set<string>> = {};

    allVehicles.forEach(vehicle => {
      const make = vehicle.make.trim();
      const model = vehicle.model.trim();
      
      makesSet.add(make);
      
      if (!modelsByMake[make]) {
        modelsByMake[make] = new Set<string>();
      }
      modelsByMake[make].add(model);
    });

    // Convert to sorted arrays
    const makes = Array.from(makesSet).sort();
    const allModels = new Set<string>();
    
    // Convert modelsByMake to use arrays and collect all models
    const modelsByMakeResult: Record<string, string[]> = {};
    Object.keys(modelsByMake).forEach(make => {
      const models = Array.from(modelsByMake[make]).sort();
      modelsByMakeResult[make] = models;
      models.forEach(model => allModels.add(model));
    });

    const models = Array.from(allModels).sort();

    return {
      makes,
      models,
      modelsByMake: modelsByMakeResult
    };

  } catch (error) {
    console.error('Error getting vehicle suggestions:', error);
    return {
      makes: [],
      models: [],
      modelsByMake: {}
    };
  }
}

/**
 * Get models for a specific make
 */
export async function getModelsForMake(make: string): Promise<string[]> {
  try {
    const modelsResult = await db
      .select({ model: vehicles.model })
      .from(vehicles)
      .where(sql`LOWER(TRIM(${vehicles.make})) = ${make.toLowerCase().trim()}`);

    const uniqueModels = new Set(modelsResult.map(r => r.model.trim()));
    return Array.from(uniqueModels).sort();

  } catch (error) {
    console.error('Error getting models for make:', error);
    return [];
  }
}

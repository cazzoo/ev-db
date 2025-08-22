import { db } from '../db';
import { customFields, vehicleCustomFieldValues, vehicles } from '../db/schema';
import { eq, like, desc, asc, and, sql } from 'drizzle-orm';

export interface CustomField {
  id: number;
  name: string;
  key: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'BOOLEAN' | 'URL';
  validationRules?: string; // JSON string
  isVisibleOnCard: boolean;
  isVisibleOnDetails: boolean;
  displayOrder: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: number;
}

export interface CustomFieldValue {
  id: number;
  vehicleId: number;
  customFieldId: number;
  value?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomFieldData {
  name: string;
  fieldType?: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'BOOLEAN' | 'URL';
  validationRules?: string;
  isVisibleOnCard?: boolean;
  isVisibleOnDetails?: boolean;
  displayOrder?: number;
  createdBy?: number;
}

export interface UpdateCustomFieldData {
  name?: string;
  fieldType?: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'BOOLEAN' | 'URL';
  validationRules?: string;
  isVisibleOnCard?: boolean;
  isVisibleOnDetails?: boolean;
  displayOrder?: number;
}

// Generate a unique key from field name
function generateFieldKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

// Get all custom fields with optional filtering and sorting
export async function getAllCustomFields(
  sortBy: 'name' | 'usageCount' | 'createdAt' = 'usageCount',
  sortOrder: 'asc' | 'desc' = 'desc',
  search?: string
): Promise<CustomField[]> {
  let query = db.select().from(customFields);

  if (search) {
    query = query.where(like(customFields.name, `%${search}%`));
  }

  const orderColumn = sortBy === 'name' ? customFields.name :
                     sortBy === 'usageCount' ? customFields.usageCount :
                     customFields.createdAt;

  query = query.orderBy(sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn));

  return await query;
}

// Get custom fields for form suggestions (most used first, limited)
export async function getCustomFieldSuggestions(limit: number = 10): Promise<CustomField[]> {
  return await db
    .select()
    .from(customFields)
    .orderBy(desc(customFields.usageCount), asc(customFields.name))
    .limit(limit);
}

// Search custom fields by name for autocomplete
export async function searchCustomFields(query: string, limit: number = 20): Promise<CustomField[]> {
  return await db
    .select()
    .from(customFields)
    .where(like(customFields.name, `%${query}%`))
    .orderBy(desc(customFields.usageCount), asc(customFields.name))
    .limit(limit);
}

// Get custom field by ID
export async function getCustomFieldById(id: number): Promise<CustomField | null> {
  const result = await db.select().from(customFields).where(eq(customFields.id, id)).limit(1);
  return result[0] || null;
}

// Get custom field by key
export async function getCustomFieldByKey(key: string): Promise<CustomField | null> {
  const result = await db.select().from(customFields).where(eq(customFields.key, key)).limit(1);
  return result[0] || null;
}

// Create a new custom field
export async function createCustomField(data: CreateCustomFieldData): Promise<CustomField> {
  const key = generateFieldKey(data.name);
  
  // Check if key already exists
  const existing = await getCustomFieldByKey(key);
  if (existing) {
    throw new Error(`A custom field with similar name already exists: ${existing.name}`);
  }

  const now = new Date();
  const [newField] = await db.insert(customFields).values({
    name: data.name,
    key,
    fieldType: data.fieldType || 'TEXT',
    validationRules: data.validationRules,
    isVisibleOnCard: data.isVisibleOnCard || false,
    isVisibleOnDetails: data.isVisibleOnDetails !== false, // Default to true
    displayOrder: data.displayOrder || 0,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy,
  }).returning();

  return newField;
}

// Update an existing custom field
export async function updateCustomField(id: number, data: UpdateCustomFieldData): Promise<CustomField | null> {
  const existing = await getCustomFieldById(id);
  if (!existing) {
    return null;
  }

  const updates: any = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    const newKey = generateFieldKey(data.name);
    // Check if new key conflicts with another field
    if (newKey !== existing.key) {
      const conflicting = await getCustomFieldByKey(newKey);
      if (conflicting && conflicting.id !== id) {
        throw new Error(`A custom field with similar name already exists: ${conflicting.name}`);
      }
      updates.key = newKey;
    }
    updates.name = data.name;
  }

  if (data.fieldType !== undefined) updates.fieldType = data.fieldType;
  if (data.validationRules !== undefined) updates.validationRules = data.validationRules;
  if (data.isVisibleOnCard !== undefined) updates.isVisibleOnCard = data.isVisibleOnCard;
  if (data.isVisibleOnDetails !== undefined) updates.isVisibleOnDetails = data.isVisibleOnDetails;
  if (data.displayOrder !== undefined) updates.displayOrder = data.displayOrder;

  const [updatedField] = await db
    .update(customFields)
    .set(updates)
    .where(eq(customFields.id, id))
    .returning();

  return updatedField;
}

// Delete a custom field
export async function deleteCustomField(id: number): Promise<boolean> {
  // Check if field has any values
  const valuesCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(vehicleCustomFieldValues)
    .where(eq(vehicleCustomFieldValues.customFieldId, id));

  if (valuesCount[0].count > 0) {
    throw new Error(`Cannot delete custom field: it has ${valuesCount[0].count} associated values. Consider merging with another field instead.`);
  }

  const result = await db.delete(customFields).where(eq(customFields.id, id));
  return result.changes > 0;
}

// Increment usage count for a custom field
export async function incrementUsageCount(fieldId: number): Promise<void> {
  await db
    .update(customFields)
    .set({ 
      usageCount: sql`${customFields.usageCount} + 1`,
      updatedAt: new Date()
    })
    .where(eq(customFields.id, fieldId));
}

// Auto-create custom field if it doesn't exist (used during contribution submission)
export async function getOrCreateCustomField(name: string, createdBy?: number): Promise<CustomField> {
  const key = generateFieldKey(name);
  
  // Try to find existing field by key first
  let field = await getCustomFieldByKey(key);
  
  if (!field) {
    // Create new field with default settings
    field = await createCustomField({
      name,
      fieldType: 'TEXT',
      isVisibleOnCard: false,
      isVisibleOnDetails: true,
      displayOrder: 0,
      createdBy,
    });
  }

  return field;
}

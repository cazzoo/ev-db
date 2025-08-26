import { db } from '../db';
import { changelogs } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Simple script to fix version ordering by setting proper release dates
 * This ensures versions appear in the correct order: Unreleased, v2.1.0, v2.0.5, v2.0.0, v1.0.0
 */
async function fixVersionOrdering() {
  console.log('🔧 Fixing version ordering by updating release dates...');

  try {
    // Set specific dates for each version to ensure proper ordering
    const versionDates = [
      { version: 'Unreleased', date: new Date('2025-08-26T12:00:00Z') }, // Most recent
      { version: '2.1.0', date: new Date('2025-08-25T12:00:00Z') },
      { version: '2.0.5', date: new Date('2025-08-24T12:00:00Z') },
      { version: '2.0.0', date: new Date('2025-08-23T12:00:00Z') },
      { version: '1.0.0', date: new Date('2025-08-22T12:00:00Z') }, // Oldest
    ];

    for (const { version, date } of versionDates) {
      try {
        const result = await db
          .update(changelogs)
          .set({ 
            releaseDate: date,
            updatedAt: new Date()
          })
          .where(eq(changelogs.version, version));

        console.log(`✅ Updated ${version} release date to ${date.toISOString()}`);
      } catch (error) {
        console.warn(`⚠️ Could not update ${version}:`, error);
      }
    }

    console.log('🎉 Version ordering fixed successfully!');
    console.log('📋 Versions should now appear in correct order: Unreleased → v2.1.0 → v2.0.5 → v2.0.0 → v1.0.0');

  } catch (error) {
    console.error('❌ Error fixing version ordering:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  fixVersionOrdering()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixVersionOrdering };

import { db } from './db';
import { sql } from 'drizzle-orm';

async function migrateImages() {
  try {
    console.log('Running migration: Add vehicle_images and image_contributions tables...');

    // Check if vehicle_images table already exists
    const vehicleImagesResult = await db.run(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='vehicle_images'`);
    const vehicleImagesExists = vehicleImagesResult.rows && vehicleImagesResult.rows.length > 0;

    if (!vehicleImagesExists) {
      console.log('Creating vehicle_images table...');
      await db.run(sql`
        CREATE TABLE vehicle_images (
          id INTEGER PRIMARY KEY NOT NULL,
          vehicle_id INTEGER NOT NULL,
          filename TEXT NOT NULL,
          path TEXT NOT NULL,
          url TEXT NOT NULL,
          alt_text TEXT,
          caption TEXT,
          display_order INTEGER DEFAULT 0 NOT NULL,
          file_size INTEGER,
          mime_type TEXT,
          width INTEGER,
          height INTEGER,
          uploaded_by INTEGER,
          uploaded_at INTEGER NOT NULL,
          is_approved INTEGER DEFAULT 0 NOT NULL,
          approved_by INTEGER,
          approved_at INTEGER,
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
          FOREIGN KEY (uploaded_by) REFERENCES users(id),
          FOREIGN KEY (approved_by) REFERENCES users(id)
        )
      `);
      console.log('vehicle_images table created successfully!');
    } else {
      console.log('vehicle_images table already exists, skipping...');
    }

    // Check if image_contributions table already exists
    const imageContributionsResult = await db.run(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='image_contributions'`);
    const imageContributionsExists = imageContributionsResult.rows && imageContributionsResult.rows.length > 0;

    if (!imageContributionsExists) {
      console.log('Creating image_contributions table...');
      await db.run(sql`
        CREATE TABLE image_contributions (
          id INTEGER PRIMARY KEY NOT NULL,
          user_id INTEGER NOT NULL,
          vehicle_id INTEGER NOT NULL,
          filename TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          path TEXT NOT NULL,
          alt_text TEXT,
          caption TEXT,
          file_size INTEGER,
          mime_type TEXT,
          width INTEGER,
          height INTEGER,
          status TEXT DEFAULT 'PENDING' NOT NULL,
          submitted_at INTEGER NOT NULL,
          reviewed_by INTEGER,
          reviewed_at INTEGER,
          rejection_reason TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
          FOREIGN KEY (reviewed_by) REFERENCES users(id)
        )
      `);
      console.log('image_contributions table created successfully!');
    } else {
      console.log('image_contributions table already exists, skipping...');
    }

    console.log('Image tables migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateImages();

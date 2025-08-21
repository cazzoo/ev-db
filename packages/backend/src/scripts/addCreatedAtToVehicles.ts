import { sqlClient } from '../db';

async function addCreatedAtToVehicles() {
  try {
    console.log('🔍 Checking vehicles table structure...');
    
    // Check current table structure
    const tableInfo = await sqlClient.execute(`PRAGMA table_info(vehicles)`);
    const columns = tableInfo.rows || [];
    console.log('Current columns:', columns.map((col: any) => col.name));
    
    const hasCreatedAt = columns.some((col: any) => col.name === 'created_at');
    
    if (!hasCreatedAt) {
      console.log('➕ Adding created_at column to vehicles table...');
      
      // Add the column with a default value (current timestamp)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      await sqlClient.execute(`ALTER TABLE vehicles ADD COLUMN created_at INTEGER NOT NULL DEFAULT ${currentTimestamp}`);
      
      console.log('📊 Creating indexes...');
      
      // Add indexes
      await sqlClient.execute(`CREATE INDEX IF NOT EXISTS vehicles_created_at_idx ON vehicles(created_at)`);
      await sqlClient.execute(`CREATE INDEX IF NOT EXISTS vehicles_make_model_idx ON vehicles(make, model)`);
      
      console.log('✅ Successfully added created_at column and indexes to vehicles table');
      
      // Check how many vehicles exist
      const countResult = await sqlClient.execute(`SELECT COUNT(*) as count FROM vehicles`);
      const count = countResult.rows?.[0]?.count || 0;
      console.log(`📈 Updated ${count} existing vehicles with creation timestamp`);
      
    } else {
      console.log('✅ created_at column already exists in vehicles table');
    }
    
    // Verify the final structure
    console.log('🔍 Final table structure:');
    const finalTableInfo = await sqlClient.execute(`PRAGMA table_info(vehicles)`);
    const finalColumns = finalTableInfo.rows || [];
    finalColumns.forEach((col: any) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding created_at column:', error);
    throw error;
  }
}

// Run the script
addCreatedAtToVehicles()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

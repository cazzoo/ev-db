import { db } from './db/index.js';
import { contributions, vehicles } from './db/schema.js';

async function checkContributions() {
  try {
    console.log('Checking existing contributions...');
    const existingContributions = await db.select().from(contributions);
    console.log(`Found ${existingContributions.length} contributions`);

    for (const contrib of existingContributions) {
      console.log(`Contribution ${contrib.id}:`);
      console.log(`  - Type: ${contrib.changeType}`);
      console.log(`  - Target Vehicle ID: ${contrib.targetVehicleId}`);
      console.log(`  - Vehicle Data ID: ${(contrib.vehicleData as any)?.id || 'N/A'}`);
      console.log(`  - Status: ${contrib.status}`);
      console.log(`  - User: ${contrib.userId}`);
      console.log('---');
    }

    console.log('\nChecking vehicles...');
    const allVehicles = await db.select().from(vehicles);
    console.log(`Found ${allVehicles.length} vehicles`);

    for (const vehicle of allVehicles) {
      console.log(`Vehicle ${vehicle.id}: ${vehicle.make} ${vehicle.model} (${vehicle.year})`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkContributions().then(() => {
  console.log('Check completed');
  process.exit(0);
});

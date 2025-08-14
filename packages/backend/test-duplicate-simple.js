// Simple test to check if duplicate detection service works
import { checkForDuplicate } from './src/services/vehicleDuplicateService.js';

async function test() {
  try {
    console.log('Testing duplicate detection service...');

    const testVehicle = {
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      batteryCapacity: 75,
      range: 500,
      chargingSpeed: 150
    };

    console.log('Calling checkForDuplicate...');
    const result = await checkForDuplicate(testVehicle);
    console.log('Result:', result);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();

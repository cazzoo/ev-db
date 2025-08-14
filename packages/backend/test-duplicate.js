// Simple test to check if duplicate detection works
const { checkForDuplicate } = require('./dist/services/vehicleDuplicateService.js');

async function test() {
  try {
    console.log('Testing duplicate detection...');
    
    const testVehicle = {
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      batteryCapacity: 75,
      range: 500,
      chargingSpeed: 150
    };
    
    const result = await checkForDuplicate(testVehicle);
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();

// Script to test admin notification routes
async function testAdminNotificationRoutes() {
  console.log('🔍 Testing admin notification routes...\n');

  const baseUrl = 'http://localhost:3000/api/admin/notifications';
  
  // We need to get a valid admin token first
  console.log('1️⃣ Getting admin token...');
  
  try {
    // Login as admin
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Admin token obtained');

    // Test scheduled notifications endpoint
    console.log('\n2️⃣ Testing GET /admin/notifications/scheduled...');
    const scheduledResponse = await fetch(`${baseUrl}/scheduled`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log(`Status: ${scheduledResponse.status} ${scheduledResponse.statusText}`);
    if (scheduledResponse.ok) {
      const scheduledData = await scheduledResponse.json();
      console.log('Scheduled notifications data:', JSON.stringify(scheduledData, null, 2));
    } else {
      const errorText = await scheduledResponse.text();
      console.log('Error response:', errorText);
    }

    // Test analytics endpoint
    console.log('\n3️⃣ Testing GET /admin/notifications/analytics...');
    const analyticsResponse = await fetch(`${baseUrl}/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log(`Status: ${analyticsResponse.status} ${analyticsResponse.statusText}`);
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('Analytics data:', JSON.stringify(analyticsData, null, 2));
    } else {
      const errorText = await analyticsResponse.text();
      console.log('Error response:', errorText);
    }

    // Test templates endpoint
    console.log('\n4️⃣ Testing GET /admin/notifications/templates...');
    const templatesResponse = await fetch(`${baseUrl}/templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log(`Status: ${templatesResponse.status} ${templatesResponse.statusText}`);
    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      console.log('Templates data:', JSON.stringify(templatesData, null, 2));
    } else {
      const errorText = await templatesResponse.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing admin notification routes:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testAdminNotificationRoutes()
    .then(() => {
      console.log('\n✅ Admin notification routes test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Admin notification routes test failed:', error);
      process.exit(1);
    });
}

export { testAdminNotificationRoutes };

import jwt from 'jsonwebtoken';

// Script to generate a valid admin token for testing
async function getAdminToken() {
  console.log('🔑 Generating admin token for testing...\n');

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    // Create admin token payload
    const payload = {
      userId: 1,
      email: 'admin@example.com',
      role: 'ADMIN',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const token = jwt.sign(payload, JWT_SECRET);
    
    console.log('✅ Admin token generated:');
    console.log(token);
    
    console.log('\n🧪 Test the endpoints with:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/admin/notifications/notifications/scheduled`);
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/admin/notifications/analytics`);

    return token;

  } catch (error) {
    console.error('❌ Error generating admin token:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  getAdminToken()
    .then(() => {
      console.log('\n✅ Admin token generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Admin token generation failed:', error);
      process.exit(1);
    });
}

export { getAdminToken };

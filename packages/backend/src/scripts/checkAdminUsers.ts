import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Script to check admin users in the database
async function checkAdminUsers() {
  console.log('🔍 Checking admin users in database...\n');

  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} total users:`);
    
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
    });

    // Get admin users specifically
    const adminUsers = await db.select().from(users).where(eq(users.role, 'ADMIN'));
    console.log(`\nFound ${adminUsers.length} admin users:`);
    
    adminUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
    });

    if (adminUsers.length === 0) {
      console.log('\n⚠️ No admin users found! You may need to create one.');
      console.log('You can create an admin user by:');
      console.log('1. Registering a regular user');
      console.log('2. Manually updating their role to ADMIN in the database');
    }

  } catch (error) {
    console.error('❌ Error checking admin users:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the check
if (require.main === module) {
  checkAdminUsers()
    .then(() => {
      console.log('\n✅ Admin user check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Admin user check failed:', error);
      process.exit(1);
    });
}

export { checkAdminUsers };

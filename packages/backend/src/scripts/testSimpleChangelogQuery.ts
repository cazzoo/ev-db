import { db } from '../db';
import { changelogs, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

// Script to test simple changelog queries
async function testSimpleChangelogQuery() {
  console.log('🔍 Testing simple changelog queries...\n');

  try {
    console.log('1️⃣ Testing basic select from changelogs...');
    const basicResult = await db.select().from(changelogs);
    console.log(`Found ${basicResult.length} changelogs`);
    console.log('First changelog:', JSON.stringify(basicResult[0], null, 2));

    console.log('\n2️⃣ Testing select with specific fields...');
    const specificResult = await db
      .select({
        id: changelogs.id,
        version: changelogs.version,
        title: changelogs.title,
        isPublished: changelogs.isPublished,
      })
      .from(changelogs);
    console.log(`Found ${specificResult.length} changelogs with specific fields`);
    console.log('First changelog:', JSON.stringify(specificResult[0], null, 2));

    console.log('\n3️⃣ Testing with where clause...');
    const publishedResult = await db
      .select({
        id: changelogs.id,
        version: changelogs.version,
        title: changelogs.title,
        isPublished: changelogs.isPublished,
      })
      .from(changelogs)
      .where(eq(changelogs.isPublished, true));
    console.log(`Found ${publishedResult.length} published changelogs`);

    console.log('\n4️⃣ Testing with leftJoin...');
    const joinResult = await db
      .select({
        id: changelogs.id,
        version: changelogs.version,
        title: changelogs.title,
        isPublished: changelogs.isPublished,
        authorEmail: users.email,
      })
      .from(changelogs)
      .leftJoin(users, eq(changelogs.createdBy, users.id))
      .where(eq(changelogs.isPublished, true));
    console.log(`Found ${joinResult.length} changelogs with join`);
    console.log('First changelog with join:', JSON.stringify(joinResult[0], null, 2));

  } catch (error) {
    console.error('❌ Error in simple query test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testSimpleChangelogQuery()
    .then(() => {
      console.log('\n✅ Simple query test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Simple query test failed:', error);
      process.exit(1);
    });
}

export { testSimpleChangelogQuery };

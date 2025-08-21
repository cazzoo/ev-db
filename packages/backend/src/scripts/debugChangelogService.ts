import { ChangelogService } from '../services/changelogService';

// Script to debug the ChangelogService
async function debugChangelogService() {
  console.log('🔍 Debugging ChangelogService...\n');

  try {
    console.log('1️⃣ Testing getChangelogs with publishedOnly=true...');
    const result = await ChangelogService.getChangelogs(1, 10, true);
    console.log('Result:', JSON.stringify(result, null, 2));

    console.log('\n2️⃣ Testing getChangelogs with publishedOnly=false...');
    const allResult = await ChangelogService.getChangelogs(1, 10, false);
    console.log('All changelogs result:', JSON.stringify(allResult, null, 2));

    console.log('\n3️⃣ Testing getLatestChangelog...');
    const latest = await ChangelogService.getLatestChangelog();
    console.log('Latest changelog:', JSON.stringify(latest, null, 2));

  } catch (error) {
    console.error('❌ Error in ChangelogService:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug script
if (require.main === module) {
  debugChangelogService()
    .then(() => {
      console.log('\n✅ Debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Debug failed:', error);
      process.exit(1);
    });
}

export { debugChangelogService };

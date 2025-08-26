import { compareVersions, sortVersionsDescending, parseVersion } from '../utils/versionUtils';

/**
 * Test script for version sorting functionality
 */
async function testVersionSorting() {
  console.log('🧪 Testing Version Sorting Utility\n');

  // Test version parsing
  console.log('1️⃣ Testing version parsing:');
  const testVersions = ['Unreleased', 'v2.1.0', '2.0.5', 'v2.0.0', 'v1.0.0'];
  
  testVersions.forEach(version => {
    const parsed = parseVersion(version);
    console.log(`   ${version} -> major: ${parsed.major}, minor: ${parsed.minor}, patch: ${parsed.patch}, unreleased: ${parsed.isUnreleased}`);
  });

  // Test version comparison
  console.log('\n2️⃣ Testing version comparison:');
  const comparisons = [
    ['Unreleased', 'v2.1.0'],
    ['v2.1.0', 'v2.0.5'],
    ['v2.0.5', 'v2.0.0'],
    ['v2.0.0', 'v1.0.0'],
  ];

  comparisons.forEach(([a, b]) => {
    const result = compareVersions(a, b);
    const relation = result < 0 ? 'comes before' : result > 0 ? 'comes after' : 'equals';
    console.log(`   ${a} ${relation} ${b} (${result})`);
  });

  // Test sorting
  console.log('\n3️⃣ Testing version sorting:');
  const unsortedVersions = ['v1.0.0', 'v2.0.5', 'Unreleased', 'v2.0.0', 'v2.1.0'];
  const sortedVersions = sortVersionsDescending(unsortedVersions);
  
  console.log('   Unsorted:', unsortedVersions);
  console.log('   Sorted:  ', sortedVersions);

  // Test with objects (like changelogs)
  console.log('\n4️⃣ Testing with changelog-like objects:');
  const mockChangelogs = [
    { id: 1, version: 'v1.0.0', title: 'Initial release' },
    { id: 2, version: '2.0.5', title: 'Bug fixes' },
    { id: 3, version: 'Unreleased', title: 'Latest changes' },
    { id: 4, version: 'v2.0.0', title: 'Major update' },
    { id: 5, version: 'v2.1.0', title: 'Feature release' },
  ];

  const sortedChangelogs = [...mockChangelogs].sort((a, b) => compareVersions(a.version, b.version));
  
  console.log('   Original order:');
  mockChangelogs.forEach(c => console.log(`     ${c.version} - ${c.title}`));
  
  console.log('   Sorted order:');
  sortedChangelogs.forEach(c => console.log(`     ${c.version} - ${c.title}`));

  console.log('\n✅ Version sorting test completed!');
}

// Run the test
if (require.main === module) {
  testVersionSorting().catch(console.error);
}

export { testVersionSorting };

import { GitCommitParser } from '../services/gitCommitParser';
import { CommitCategorizationService } from '../services/commitCategorizationService';
import { GitChangelogService } from '../services/gitChangelogService';
import { ChangelogFormatterService } from '../services/changelogFormatterService';

async function testGitChangelogFeatures() {
  console.log('🧪 Testing Git Changelog Features\n');

  try {
    // 1. Test Git Commit Parser
    console.log('1️⃣ Testing Git Commit Parser...');
    const parser = new GitCommitParser();
    
    // Get recent commits
    const commits = await parser.parseCommits({ maxCount: 10 });
    console.log(`   📝 Found ${commits.length} recent commits`);
    
    if (commits.length > 0) {
      const firstCommit = commits[0];
      console.log(`   📋 Latest commit: ${firstCommit.shortHash} - ${firstCommit.subject}`);
      console.log(`   👤 Author: ${firstCommit.author} (${firstCommit.authorEmail})`);
      console.log(`   📅 Date: ${firstCommit.date.toISOString()}`);
      console.log(`   📊 Changes: +${firstCommit.insertions} -${firstCommit.deletions}`);
      console.log(`   📁 Files: ${firstCommit.filesChanged.length} files changed`);
    }

    // 2. Test Commit Categorization
    console.log('\n2️⃣ Testing Commit Categorization...');
    const categorizer = new CommitCategorizationService();
    
    if (commits.length > 0) {
      const categorizedCommits = categorizer.categorizeCommits(commits);
      const publicCommits = categorizer.filterForPublicChangelog(categorizedCommits);
      const groupedCommits = categorizer.groupByCategory(categorizedCommits);
      
      console.log(`   📊 Categorized ${categorizedCommits.length} commits`);
      console.log(`   🌍 ${publicCommits.length} commits are public`);
      
      // Show category breakdown
      for (const [category, categoryCommits] of Object.entries(groupedCommits)) {
        if (categoryCommits.length > 0) {
          const categoryInfo = CommitCategorizationService.getCategoryInfo(category as any);
          console.log(`   ${categoryInfo.emoji} ${categoryInfo.title}: ${categoryCommits.length} commits`);
        }
      }
      
      // Show some examples
      console.log('\n   📋 Example categorized commits:');
      categorizedCommits.slice(0, 3).forEach(commit => {
        const categoryInfo = CommitCategorizationService.getCategoryInfo(commit.category);
        console.log(`   • ${categoryInfo.emoji} [${commit.category}] ${commit.cleanTitle}`);
        console.log(`     ${commit.shortHash} - Public: ${commit.isPublic ? '✅' : '❌'} - Breaking: ${commit.isBreakingChange ? '💥' : '❌'}`);
      });
    }

    // 3. Test Git Changelog Service
    console.log('\n3️⃣ Testing Git Changelog Service...');
    const gitService = new GitChangelogService();
    
    // Sync commits to database
    console.log('   🔄 Syncing commits to database...');
    const syncedCount = await gitService.syncCommitsToDatabase({ maxCount: 20 });
    console.log(`   ✅ Synced ${syncedCount} commits to database`);
    
    // Get commits since last release
    console.log('   📋 Getting commits since last release...');
    const unreleasedCommits = await gitService.getCommitsSinceLastRelease();
    console.log(`   📝 Found ${unreleasedCommits.length} unreleased commits`);
    
    // Preview changelog
    console.log('   👀 Previewing changelog...');
    const preview = await gitService.previewChangelog({
      includeUnreleased: true,
    });
    console.log(`   📊 Preview stats:`);
    console.log(`     • Total commits: ${preview.stats.total}`);
    console.log(`     • Public commits: ${preview.stats.public}`);
    console.log(`     • By category:`);
    for (const [category, count] of Object.entries(preview.stats.byCategory)) {
      if (count > 0) {
        const categoryInfo = CommitCategorizationService.getCategoryInfo(category as any);
        console.log(`       ${categoryInfo.emoji} ${categoryInfo.title}: ${count}`);
      }
    }

    // 4. Test Changelog Formatter
    console.log('\n4️⃣ Testing Changelog Formatter...');
    const formatter = new ChangelogFormatterService();
    
    // Check if we have any published changelogs
    try {
      const jsonData = await formatter.generateJSON();
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        console.log(`   📋 Found ${jsonData.length} published changelogs`);
        
        // Generate markdown for the latest changelog
        const latestVersion = jsonData[0].version;
        console.log(`   📝 Generating markdown for version ${latestVersion}...`);
        
        const markdown = await formatter.generateMarkdown(latestVersion, {
          includeMetadata: true,
          includeCommitHashes: true,
          groupByCategory: true,
        });
        
        console.log('   ✅ Generated markdown changelog:');
        console.log('   ' + '─'.repeat(50));
        console.log(markdown.split('\n').map(line => '   ' + line).join('\n'));
        console.log('   ' + '─'.repeat(50));
        
      } else {
        console.log('   ℹ️ No published changelogs found');
        console.log('   💡 You can create one using the admin API endpoints');
      }
    } catch (error) {
      console.log('   ℹ️ No published changelogs available yet');
    }

    // 5. Test Repository Information
    console.log('\n5️⃣ Testing Repository Information...');
    const repoUrl = await parser.getRepositoryUrl();
    const currentBranch = await parser.getCurrentBranch();
    const hasUncommitted = await parser.hasUncommittedChanges();
    
    console.log(`   🌐 Repository URL: ${repoUrl || 'Not available'}`);
    console.log(`   🌿 Current branch: ${currentBranch || 'Not available'}`);
    console.log(`   📝 Uncommitted changes: ${hasUncommitted ? '⚠️ Yes' : '✅ No'}`);

    console.log('\n✅ All Git changelog features tested successfully!');
    console.log('\n📚 Available API endpoints:');
    console.log('   🔧 Admin endpoints:');
    console.log('     • POST /api/git-changelogs/admin/generate - Generate changelog from Git');
    console.log('     • POST /api/git-changelogs/admin/preview - Preview changelog');
    console.log('     • POST /api/git-changelogs/admin/sync-commits - Sync Git commits');
    console.log('     • GET /api/git-changelogs/admin/commits - List processed commits');
    console.log('     • PUT /api/git-changelogs/admin/commits/:hash - Update commit properties');
    console.log('   🌍 Public endpoints:');
    console.log('     • GET /api/git-changelogs/markdown/:version - Get changelog as markdown');
    console.log('     • GET /api/git-changelogs/markdown - Get full changelog as markdown');
    console.log('     • GET /api/git-changelogs/export/:format - Export changelog (json, rss, md)');

  } catch (error) {
    console.error('❌ Error testing Git changelog features:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testGitChangelogFeatures()
    .then(() => {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testGitChangelogFeatures };

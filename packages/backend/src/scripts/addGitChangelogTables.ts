import { sqlClient } from '../db';

async function addGitChangelogTables() {
  console.log('🚀 Adding Git changelog tables...\n');

  try {
    // 1. Add new columns to existing changelog_entries table
    console.log('1️⃣ Adding Git-related columns to changelog_entries table...');

    // Check if columns already exist
    const tableInfo = await sqlClient.execute(`PRAGMA table_info(changelog_entries)`);
    const columns = tableInfo.rows.map((row: any) => row.name);

    if (!columns.includes('git_commit_hash')) {
      await sqlClient.execute(`ALTER TABLE changelog_entries ADD COLUMN git_commit_hash TEXT`);
      console.log('   ✅ Added git_commit_hash column');
    } else {
      console.log('   ℹ️ git_commit_hash column already exists');
    }

    if (!columns.includes('is_auto_generated')) {
      await sqlClient.execute(`ALTER TABLE changelog_entries ADD COLUMN is_auto_generated INTEGER NOT NULL DEFAULT 0`);
      console.log('   ✅ Added is_auto_generated column');
    } else {
      console.log('   ℹ️ is_auto_generated column already exists');
    }

    // 2. Create git_commits table
    console.log('\n2️⃣ Creating git_commits table...');
    await sqlClient.execute(`
      CREATE TABLE IF NOT EXISTS git_commits (
        id INTEGER PRIMARY KEY,
        hash TEXT NOT NULL UNIQUE,
        short_hash TEXT NOT NULL,
        author TEXT NOT NULL,
        author_email TEXT NOT NULL,
        date INTEGER NOT NULL,
        message TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT,
        files_changed TEXT,
        insertions INTEGER NOT NULL DEFAULT 0,
        deletions INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        is_breaking_change INTEGER NOT NULL DEFAULT 0,
        is_public INTEGER NOT NULL DEFAULT 1,
        processed_at INTEGER NOT NULL,
        version TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ git_commits table created');

    // 3. Create indexes for git_commits table
    console.log('\n3️⃣ Creating indexes for git_commits table...');
    await sqlClient.execute(`CREATE INDEX IF NOT EXISTS git_commits_hash_idx ON git_commits(hash)`);
    await sqlClient.execute(`CREATE INDEX IF NOT EXISTS git_commits_date_idx ON git_commits(date)`);
    await sqlClient.execute(`CREATE INDEX IF NOT EXISTS git_commits_category_idx ON git_commits(category)`);
    await sqlClient.execute(`CREATE INDEX IF NOT EXISTS git_commits_version_idx ON git_commits(version)`);
    console.log('   ✅ Indexes created');

    // 4. Create commit_filters table
    console.log('\n4️⃣ Creating commit_filters table...');
    await sqlClient.execute(`
      CREATE TABLE IF NOT EXISTS commit_filters (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        pattern TEXT NOT NULL,
        filter_type TEXT NOT NULL DEFAULT 'exclude',
        category TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log('   ✅ commit_filters table created');

    // 5. Create indexes for commit_filters table
    console.log('\n5️⃣ Creating indexes for commit_filters table...');
    await sqlClient.execute(`CREATE INDEX IF NOT EXISTS commit_filters_priority_idx ON commit_filters(priority)`);
    await sqlClient.execute(`CREATE INDEX IF NOT EXISTS commit_filters_active_idx ON commit_filters(is_active)`);
    console.log('   ✅ Indexes created');

    // 6. Insert default commit filter rules
    console.log('\n6️⃣ Inserting default commit filter rules...');
    const now = Math.floor(Date.now() / 1000);

    const defaultFilters = [
      {
        name: 'Exclude Chores',
        description: 'Exclude chore commits from public changelog',
        pattern: '^(chore|build|ci|cd)(\\([^)]*\\))?:',
        filter_type: 'exclude',
        priority: 20,
      },
      {
        name: 'Exclude Documentation',
        description: 'Exclude documentation commits from public changelog',
        pattern: '^(docs?|documentation)(\\([^)]*\\))?:',
        filter_type: 'exclude',
        priority: 40,
      },
      {
        name: 'Exclude Tests',
        description: 'Exclude test commits from public changelog',
        pattern: '^(test|tests?)(\\([^)]*\\))?:',
        filter_type: 'exclude',
        priority: 30,
      },
      {
        name: 'Exclude Dependency Updates',
        description: 'Exclude dependency update commits',
        pattern: '^(update|upgrade|bump)(\\([^)]*\\))\\s+(dependencies|deps|version)',
        filter_type: 'exclude',
        priority: 19,
      },
      {
        name: 'Exclude Merges',
        description: 'Exclude merge commits',
        pattern: '^(merge|revert)(\\([^)]*\\))?:',
        filter_type: 'exclude',
        priority: 18,
      },
    ];

    for (const filter of defaultFilters) {
      try {
        // Check if filter already exists
        const existing = await sqlClient.execute(
          `SELECT id FROM commit_filters WHERE name = '${filter.name}'`
        );

        if (existing.rows.length === 0) {
          await sqlClient.execute(`
            INSERT INTO commit_filters (name, description, pattern, filter_type, priority, is_active, created_at, updated_at)
            VALUES ('${filter.name}', '${filter.description}', '${filter.pattern}', '${filter.filter_type}', ${filter.priority}, 1, ${now}, ${now})
          `);
          console.log(`   ✅ Added filter: ${filter.name}`);
        } else {
          console.log(`   ℹ️ Filter already exists: ${filter.name}`);
        }
      } catch (error) {
        console.warn(`   ⚠️ Failed to add filter ${filter.name}:`, error);
      }
    }

    console.log('\n✅ Git changelog tables setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Extended changelog_entries table with Git fields');
    console.log('   • Created git_commits table for tracking processed commits');
    console.log('   • Created commit_filters table for filtering rules');
    console.log('   • Added appropriate indexes for performance');
    console.log('   • Inserted default filtering rules');
    console.log('\n🚀 You can now use the Git changelog generation features!');

  } catch (error) {
    console.error('❌ Error setting up Git changelog tables:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addGitChangelogTables()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

export { addGitChangelogTables };

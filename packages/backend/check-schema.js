const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

try {
  // Check if avatar_url column exists
  const result = db.prepare("PRAGMA table_info(users)").all();
  console.log('Users table schema:');
  result.forEach(col => {
    console.log(`- ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  const hasAvatarUrl = result.some(col => col.name === 'avatar_url');
  console.log(`\nAvatar URL column exists: ${hasAvatarUrl}`);
  
  if (!hasAvatarUrl) {
    console.log('Adding avatar_url column...');
    db.prepare("ALTER TABLE users ADD COLUMN avatar_url text").run();
    console.log('Avatar URL column added successfully!');
  }
  
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}

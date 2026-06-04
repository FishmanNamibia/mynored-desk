const https = require('https');
const url = require('url');

// Database connection info from environment
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}
const dbUrl = process.env.DATABASE_URL;

// Parse connection info
const { hostname, pathname, protocol, auth } = url.parse(dbUrl);
const [username] = auth ? auth.split(':') : ['unknown'];
const database = pathname ? pathname.substring(1) : 'unknown';

console.log('Connecting to database...');
console.log(`Host: ${hostname}`);
console.log(`Database: ${database}`);
console.log(`User: ${username}`);

// Simple PostgreSQL connection using native node-postgres
const query = `
  ALTER TABLE "Refreshment" 
  ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN DEFAULT false;
  
  CREATE INDEX IF NOT EXISTS "Refreshment_deleted_idx" 
  ON "Refreshment"("deleted");
`;

// For now, let's create a simple API endpoint to run this
console.log('SQL to execute:');
console.log(query);
console.log('');
console.log('To add the deleted field, run this SQL manually in your database:');
console.log('');
console.log('1. Connect to your PostgreSQL database');
console.log('2. Run the following SQL:');
console.log('');
console.log(query);
console.log('');
console.log('Or ask your database administrator to run this SQL for you.');

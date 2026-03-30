import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: +(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
    `);
    console.log('Tables in database:');
    res.rows.forEach(row => console.log(`- ${row.tablename}`));
  } catch (err) {
    console.error('Error listing tables:', err);
  } finally {
    await client.end();
  }
}

main();

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
    const res = await client.query(`SELECT * FROM migrations;`);
    console.log('Applied migrations:');
    res.rows.forEach(row => console.log(`- ${row.name}`));
  } catch (err) {
    if (err.code === '42P01') {
      console.log('Migrations table does not exist.');
    } else {
      console.error('Error checking migrations:', err);
    }
  } finally {
    await client.end();
  }
}

main();

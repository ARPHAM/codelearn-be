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

  const migrations = [
    { timestamp: 1711785600000, name: 'CreateUsers1711785600000' },
    { timestamp: 1711785610000, name: 'CreateCourses1711785610000' },
    { timestamp: 1711785620000, name: 'CreateAssignmentsAndBanks1711785620000' },
    { timestamp: 1711785630000, name: 'CreateExams1711785630000' },
    { timestamp: 1711785640000, name: 'CreateLanguagesAndProblems1711785640000' },
    { timestamp: 1711785650000, name: 'CreateExercises1711785650000' },
    { timestamp: 1711785660000, name: 'CreateSubmissions1711785660000' }
  ];

  try {
    await client.connect();
    
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        timestamp bigint NOT NULL,
        name varchar NOT NULL
      );
    `);

    for (const m of migrations) {
      await client.query(
        'INSERT INTO migrations (timestamp, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [m.timestamp, m.name]
      );
    }
    console.log('Migration history synchronized.');
  } catch (err) {
    console.error('Error synchronizing migration history:', err);
  } finally {
    await client.end();
  }
}

main();

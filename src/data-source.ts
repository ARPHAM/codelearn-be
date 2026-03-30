import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [path.join(__dirname, 'modules/**/entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false, // Always false for migrations
  logging: process.env.DB_LOGGING === 'true',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;

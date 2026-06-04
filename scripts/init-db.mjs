/**
 * Creates database and tables on your local MySQL.
 * Uses variables from .env (copy from .env.example).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

if (existsSync(envPath)) {
  config({ path: envPath });
}

const host = process.env.DB_HOST ?? 'localhost';
const port = Number(process.env.DB_PORT ?? 3306);
const user = process.env.DB_USER ?? 'root';
const password = process.env.DB_PASSWORD ?? '';
const sqlPath = resolve(root, 'database', 'init.sql');

const sql = readFileSync(sqlPath, 'utf8');

console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

const connection = await mysql.createConnection({
  host,
  port,
  user,
  password,
  multipleStatements: true,
});

try {
  await connection.query(sql);
  console.log('Database initialized: knocksafe (schema ready).');
  console.log('Start auth-service to seed admin and sample rep.');
} finally {
  await connection.end();
}

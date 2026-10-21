import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      `mysql://${process.env.SQL_USER || 'root'}:${encodeURIComponent(process.env.SQL_PASSWORD || '')}@${process.env.SQL_HOST || 'localhost'}:${process.env.SQL_PORT || 3306}/${process.env.SQL_DB_NAME || 'kontrakanku'}`,
  },
});

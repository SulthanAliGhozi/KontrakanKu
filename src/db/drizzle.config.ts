import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: process.env.DATABASE_URL 
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.SQL_HOST!,
        user: process.env.SQL_USER!,
        database: process.env.SQL_DB_NAME!,
      },
  verbose: true,
});

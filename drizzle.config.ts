import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit 不会自动加载 .env.local，需要手动加载
config({ path: ".env.local" });

const dbUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
const isRemote = dbUrl.startsWith("libsql://");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: isRemote ? "turso" : "sqlite",
  dbCredentials: isRemote
    ? { url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN }
    : { url: dbUrl },
});

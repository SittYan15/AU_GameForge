import pg from "pg";

const { Pool } = pg;

const databaseUrl = new URL(process.env.DATABASE_URL);
if (process.env.DATABASE_HOST) databaseUrl.hostname = process.env.DATABASE_HOST;

const pool = new Pool({
    connectionString: databaseUrl.toString(),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error.message);
});

export default pool;

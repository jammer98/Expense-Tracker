import pg from "pg";
import logger from "../utils/logger.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
});

pool.on("connect", () => {
  logger.info("PostgreSQL pool: new client connected");
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle PostgreSQL client");
  process.exit(1);
});

export default pool;
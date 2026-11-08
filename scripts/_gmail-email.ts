import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query(
  "UPDATE gmail_connections SET email = $1, updated_at = now() WHERE composio_account_id = $2 AND email IS NULL RETURNING clerk_user_id, email",
  ["skyforgerealms@gmail.com", "ca_tHN6oaVI3vM8"],
);
console.log("updated", result.rowCount, result.rows);
await pool.end();

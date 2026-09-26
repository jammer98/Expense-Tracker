import pool from "../config/Db.js";


export async function upsertBudget(userId, categoryId, monthlyLimit) {
  const { rows } = await pool.query(
    `INSERT INTO budgets (user_id, category_id, monthly_limit)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, category_id)
     DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
     RETURNING id, category_id, monthly_limit`,
    [userId, categoryId, monthlyLimit]
  );
  return rows[0];
}

export async function listBudgets(userId) {
  const { rows } = await pool.query(
    `SELECT b.id, b.category_id, c.name AS category_name, b.monthly_limit
     FROM budgets b
     JOIN categories c ON b.category_id = c.id
     WHERE b.user_id = $1
     ORDER BY c.name`,
    [userId]
  );
  return rows;
}
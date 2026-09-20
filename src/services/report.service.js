import pool from "../config/Db.js"

export async function getSummaryReport({ userId, startDate, endDate }) {
  const params = [userId];
  let dateFilter = "";

  if (startDate) {
    params.push(startDate);
    dateFilter += ` AND spent_on >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    dateFilter += ` AND spent_on <= $${params.length}`;
  }

  const totalResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
     FROM expenses WHERE user_id = $1 ${dateFilter}`,
    params
  );

  const byCategoryResult = await pool.query(
    `SELECT COALESCE(c.name, 'Uncategorized') AS category, SUM(e.amount) AS total, COUNT(*) AS count
     FROM expenses e
     LEFT JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = $1 ${dateFilter}
     GROUP BY c.name
     ORDER BY total DESC`,
    params
  );

  const total = Number(totalResult.rows[0].total);
  const byCategory = byCategoryResult.rows.map((row) => ({
    category: row.category,
    total: Number(row.total),
    count: Number(row.count),
    percentage: total > 0 ? Number(((row.total / total) * 100).toFixed(1)) : 0,
  }));

  return {
    startDate: startDate || null,
    endDate: endDate || null,
    total,
    expenseCount: Number(totalResult.rows[0].count),
    byCategory,
  };
}

// For the cron job — one row per user, their spend over the last 7 days
export async function getWeeklySummaryForAllUsers() {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.name, u.email,
            COALESCE(SUM(e.amount), 0) AS total,
            COUNT(e.id) AS count
     FROM users u
     LEFT JOIN expenses e
       ON e.user_id = u.id AND e.spent_on >= CURRENT_DATE - INTERVAL '7 days'
     GROUP BY u.id, u.name, u.email`
  );
  return rows;
}
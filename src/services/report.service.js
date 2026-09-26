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

// Month-over-month change per category, using LAG() to compare to the previous month
export async function getMonthOverMonth({ userId }) {
  const { rows } = await pool.query(`
    WITH monthly AS (
      SELECT category_id, date_trunc('month', spent_on) AS month, SUM(amount) AS total
      FROM expenses
      WHERE user_id = $1
      GROUP BY category_id, date_trunc('month', spent_on)
    )
    SELECT m.category_id, COALESCE(c.name,'Uncategorized') AS category, m.month, m.total,
           LAG(m.total) OVER (PARTITION BY m.category_id ORDER BY m.month) AS prev_total,
           m.total - LAG(m.total) OVER (PARTITION BY m.category_id ORDER BY m.month) AS change,
           CASE WHEN LAG(m.total) OVER (PARTITION BY m.category_id ORDER BY m.month) > 0
                THEN ROUND(((m.total - LAG(m.total) OVER (PARTITION BY m.category_id ORDER BY m.month))
                     / LAG(m.total) OVER (PARTITION BY m.category_id ORDER BY m.month)) * 100, 1)
                ELSE NULL END AS percent_change
    FROM monthly m
    LEFT JOIN categories c ON c.id = m.category_id
    ORDER BY m.category_id, m.month
  `, [userId]);

  return rows.map(r => ({
    categoryId: r.category_id,
    category: r.category,
    month: r.month,
    total: Number(r.total),
    prevTotal: r.prev_total !== null ? Number(r.prev_total) : null,
    change: r.change !== null ? Number(r.change) : null,
    percentChange: r.percent_change !== null ? Number(r.percent_change) : null,
  }));
}

// Budget status for a given month, flagging overruns entirely in SQL
export async function getBudgetStatus({ userId, month }) {
  const { rows } = await pool.query(`
    WITH month_spend AS (
      SELECT category_id, COALESCE(SUM(amount),0) AS spent
      FROM expenses
      WHERE user_id = $1 AND date_trunc('month', spent_on) = date_trunc('month', $2::date)
      GROUP BY category_id
    )
    SELECT b.category_id, c.name AS category, b.monthly_limit,
           COALESCE(ms.spent, 0) AS spent,
           COALESCE(ms.spent, 0) > b.monthly_limit AS over_budget,
           ROUND((COALESCE(ms.spent,0) / b.monthly_limit) * 100, 1) AS percent_used
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN month_spend ms ON ms.category_id = b.category_id
    WHERE b.user_id = $1
    ORDER BY percent_used DESC
  `, [userId, month]);

  return rows.map(r => ({
    categoryId: r.category_id,
    category: r.category,
    monthlyLimit: Number(r.monthly_limit),
    spent: Number(r.spent),
    overBudget: r.over_budget,
    percentUsed: Number(r.percent_used),
  }));
}
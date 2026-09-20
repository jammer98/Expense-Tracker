import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "./config/Db.js";
import logger from "./utils/logger.js";

async function seed() {
  try {
    // Wipes and resets IDs — safe to rerun as many times as you want while testing
    await pool.query("TRUNCATE TABLE expenses, categories, users RESTART IDENTITY CASCADE");

    await pool.query(`
      INSERT INTO categories (name, user_id) VALUES
      ('Food', NULL), ('Transport', NULL), ('Rent', NULL), ('Utilities', NULL), ('Entertainment', NULL)
    `);

    const plainPassword = "password123"; // <- this is what you'll actually type into the login form
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const { rows: userRows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      ["Test User", "test@example.com", passwordHash]
    );
    const userId = userRows[0].id;

    const { rows: categories } = await pool.query("SELECT id, name FROM categories");
    const categoryMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    const sampleExpenses = [
      { category: "Food", amount: 450.5, description: "Groceries", spentOn: "2026-09-02" },
      { category: "Food", amount: 220.0, description: "Restaurant", spentOn: "2026-09-10" },
      { category: "Transport", amount: 150.0, description: "Fuel", spentOn: "2026-09-05" },
      { category: "Rent", amount: 12000.0, description: "September rent", spentOn: "2026-09-01" },
      { category: "Utilities", amount: 890.0, description: "Electricity bill", spentOn: "2026-09-12" },
      { category: "Entertainment", amount: 600.0, description: "Movie + dinner", spentOn: "2026-09-15" },
      { category: "Food", amount: 300.0, description: "Groceries (last month)", spentOn: "2026-08-20" }, // outside a "this month" filter — tests date-range filtering actually works
    ];

    for (const exp of sampleExpenses) {
      await pool.query(
        "INSERT INTO expenses (user_id, category_id, amount, description, spent_on) VALUES ($1, $2, $3, $4, $5)",
        [userId, categoryMap[exp.category], exp.amount, exp.description, exp.spentOn]
      );
    }

    logger.info({ userId }, "Seed complete");
    console.log(`\nSeeded. Log in with:\n  email: test@example.com\n  password: ${plainPassword}\n`);
  } catch (err) {
    logger.error({ err }, "Seeding failed");
  } finally {
    await pool.end(); // closes the connection pool so the script actually exits instead of hanging
  }
}

seed();
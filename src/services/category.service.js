import pool from "../config/Db.js";
import { AppError } from "../utils/AppError.js";

export async function getAvailableCategories(userId){
    const { rows } = await pool.query("SELECT id,name FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY name",[userId]);

    return rows;
}

export async function isCategoryAccessible(categoryId, userId){
    const { rows } = await pool.query("SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)",[categoryId,userId]);
    return rows.length > 0;
}

export async function createCategory(userId, name) {
    try {
        const { rows } = await pool.query(
            "INSERT INTO categories (name, user_id) VALUES ($1, $2) RETURNING id, name",
            [name, userId]
        );
        return rows[0];
    } catch (err) {
        if (err.code === "23505") throw new AppError("Category already exists", 409);
        throw err;
    }
}
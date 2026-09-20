import pool from "../config/Db.js";

export async function getAvailableCategories(userId){
    const { rows } = await pool.query("SELECT id,name FROM categories WHERE user_id = $1 OR IS NULL ORDER  BY name",[userId]);

    return rows;
}

export async function isCtaegoryAccessible(categoryId, userId){
    const { rows } = await pool.query("SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)",[categoryId,userId]);
    return rows.length > 0;
}
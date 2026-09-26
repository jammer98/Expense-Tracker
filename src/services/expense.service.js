import pool from "../config/Db.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import { isCategoryAccessible } from "./category.service.js";

export async function createExpense({ userId, categoryId, amount, description, spentOn}){
    if( categoryId ){
        const allowed = await isCategoryAccessible(categoryId,userId);
        if(!allowed){
            throw new AppError("Invalid category",400);
        }
    }

    const { rows } = await pool.query(
        "INSERT INTO expenses (user_id, category_id, amount, description, spent_on) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [userId,categoryId || null,amount,description || null,spentOn]
    );

    logger.info( { userId, expenseId: rows[0].id }, "Expense created");
    return rows[0];
}

export async function getExpenses({ userId, categoryId, startDate, endDate, page = 1, limit = 20 }){
    const conditions = ["user_id = $1"];
    const params = [userId];

    if(categoryId){
        params.push(categoryId);
        conditions.push(`category_id = $${params.length}`);
    }
    if(startDate){
        params.push(startDate);
        conditions.push(`spent_on >= $${params.length}`);
    }
    if(endDate){
        params.push(endDate);
        conditions.push(`spent_on <= $${params.length}`);
    }

    const offset = (page - 1) * limit;
    params.push(limit,offset);

    const { rows } = await pool.query(`
        SELECT * FROM expenses WHERE ${conditions.join(" AND ")}
        ORDER BY spent_on DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );

    return rows;
}

export async function getExpenseById({ userId, expenseId }) {
    const { rows } = await pool.query(
        "SELECT * FROM expenses WHERE id = $1 AND user_id = $2",[expenseId, userId]
    );

    if(!rows[0]) throw new AppError("Expense not found",404);
    return rows[0];
}

export async function updateExpense({ userId, expenseId, updates }){
    await getExpenseById({ userId, expenseId });

    if(updates.categoryId){
        const allowed = await isCategoryAccessible(updates.categoryId, userId);
        if(!allowed) throw new AppError("Invalid category", 400);
    }

    const fields = [];
    const params = [];
    const fieldMap = { amount: "amount", categoryId:"category_id",description:"description", spentOn:"spent_on"};

    for(const [key, column] of Object.entries(fieldMap)){
        if(updates[key] !== undefined){
            params.push(updates[key]);
            fields.push(`${column} = $${params.length}`);
        }
    }
    if(fields.length === 0) throw new AppError("No valid fields to update",400);

    params.push(expenseId,userId);
    const { rows } = await pool.query(`
        UPDATE expenses SET ${fields.join(", ")} WHERE id = $${params.length -1 } AND user_id = $${params.length} RETURNING *`,
        params
    );

    logger.info({ userId, expenseId }, "Expense updated");
    return rows[0];
}

export async function deleteExepense({ userId, expenseId }){
    await getExpenseById({ userId, expenseId})
    await pool.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2",[expenseId, userId]);
    logger.info({ userId,expenseId},"Expense deleted");
}

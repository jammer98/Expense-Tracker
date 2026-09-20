import * as expenseService from "../services/expense.service.js";
import { AppError } from "../utils/AppError";

export async function create(req,res){
    const { categoryId, amount, description, spentOn } = req.body;
    if(!amount || !spentOn ) throw new AppError("amount and spent on required",400);

    const expense = await expenseService.createExpense({
        userId: req.user.id,
        categoryId,
        amount,
        description,
        spentOn,
    });
    res.status(201).json({ expense });
}

export async function list(req,res){
    const { categoryId, startDate, endDate, page, limit }= req.query;
    const expenses = await expenseService.getExpenses({
        userId: req.user.id,
        categoryId,
        startDate,
        endDate,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
    });
    res.status(200).json({expenses});
}

export async function getOne(req,res) {
    const expense = await expenseService.getExpenseById({ userId:req.user.id, expenseId: req.params.id });
    res.status(200).json({ expense });
}

export async function update(req,res) {
    const expense = await expenseService.updateExpense({
        userId:req.user.id,
        expenseId:req.params.id,
        updates: req.body,
    });
    res.status(200).json({ expense });
}

export async function remove(req,res) {
    await expenseService.deleteExepense({ userId:req.user.id, expenseId:req.params.id })
    res.status(204).send();
}
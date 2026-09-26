import { getAvailableCategories, createCategory } from "../services/category.service.js";
import { AppError } from "../utils/AppError.js";

export async function listCategories(req,res){
    const categories = await getAvailableCategories(req.user.id);
    res.status(200).json({ categories });
}

export async function createCategoryHandler(req, res) {
    const { name } = req.body;
    if (!name || !name.trim()) throw new AppError("Category name is required", 400);
    const category = await createCategory(req.user.id, name.trim());
    res.status(201).json({ category });
}

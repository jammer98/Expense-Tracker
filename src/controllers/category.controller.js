import { getAvailableCategories } from "../services/category.service";

export async function listCategories(req,res){
    const categories = getAvailableCategories(req.user.id);
    res.status(200).json({ categories });
}
import { registerUser,loginUser } from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js"

export async function register(req,res){
    const { name,email,password } = req.body;

    if(!name || !email || !password){
        throw new AppError("every field is required",400);
    }
    if(password.length < 6){
        throw new AppError("Passowrd must be at least 6 characters",400)
    }

    const { user,token } = await registerUser({ name,email,password });
    res.status(201).json({ user,token });
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("email and password are required", 400);
  }

  const { user, token } = await loginUser({ email, password });
  res.status(200).json({ user, token });
}
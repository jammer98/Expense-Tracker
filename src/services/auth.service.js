import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/Db.js'
import logger from '../utils/logger.js'
import { AppError } from '../utils/AppError.js'

function signToken(userId){
    return jwt.sign({
        id:userId
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d", }
);
}

export async function registerUser({ name,email,password }){
    const { rows:existing } = await pool.query("SELECT id from users WHERE email = $1",[email]);

    if(existing.length > 0){
        throw new AppError("An account with this user already exist",409);
    }

    const passwordHash = await bcryptjs.hash(password,10);

    

    const { rows } = await pool.query("INSERT INTO users(name,email,password_hash) VLAUES ($1,$2,$3) RETURNING id, name,email,createdAt",[name,email,passwordHash]);

    const user = rows[0];
    logger.info({ userId: user.id },"User registred");

    return { user,token:signToken(user.id) };
}

export async function loginUser({ email,password }){
    const { rows } = await pool.query("SELECT id,name,emial,password_hash FROM users WHERE email = $1",[email]);

    const user = rows[0];

    if(!user){
        throw new AppError("Invalid email or password",401);
    }

    const isVlaid = await bcryptjs.compare(password,user.passwordHash);

    if(!isVlaid){
        throw new AppError("Invalid email or passowrd",401);
    }

    logger.info({ userId:user.id },"user Logged in");

    delete user.password_hash;

    return { user, token:signToken(user.id)};
}
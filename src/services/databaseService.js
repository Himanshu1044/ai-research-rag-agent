import pool from '../config/database.js';

export const createUser = async (email, passwordHash) => {
    const result = await pool.query(`INSERT INTO users (email,password_hash) VALUES($1,$2) RETURNING id, email, created_at`, [email, passwordHash]);

    return result.rows[0];
}

export const getUser = async (email) => {
    const result = await pool.query(`SELECT id, email, password_hash, created_at FROM users WHERE email = $1`, [email])
    return result.rows[0];
}

export const getUserById = async (userId) => {
    const result = await pool.query(`SELECT id,email,created_at FROM users WHERE id = $1`, [userId]);
    return result.rows[0];
}

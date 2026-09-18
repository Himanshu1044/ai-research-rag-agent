import pool from '../config/database.js';

export const saveMemory = async (userId, content) => {
    const result = await pool.query(
        `INSERT INTO memories
            (user_id, content)
         VALUES
            ($1, $2)
         RETURNING
            id,
            user_id,
            content,
            created_at,
            updated_at`,
        [userId, content]
    );

    return result.rows[0];
};

export const getMemoriesByUser = async (userId) => {
    const result = await pool.query(
        `SELECT
            id,
            content,
            created_at,
            updated_at
         FROM memories
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows;
};
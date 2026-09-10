import pool from '../config/database.js';

export const createResearchRequest = async (userId, question) => {
    const result = await pool.query(
        `INSERT INTO research_requests (user_id, question)
         VALUES ($1, $2)
         RETURNING id, user_id, question, status, created_at`,
        [userId, question]
    );

    return result.rows[0];
};

export const getResearchRequestsByUser = async (userId) => {
    const result = await pool.query(
        `SELECT id, question, status, created_at, completed_at
         FROM research_requests
         WHERE user_id = $1
         ORDER BY created_at DESC`, [userId])

    return result.rows;
}

export const updateResearchStatus = async (researchRequestId, status) => {

    const result = await pool.query(
        `UPDATE research_requests
         SET status = $1 
         WHERE id = $2
         RETURNING id,question,status,created_at
        `, [status, researchRequestId])

    return result.rows[0];
}

export const getResearchRequestById = async (researchRequestId) => {
    const result = await pool.query(
        `SELECT id, user_id, question, status, created_at, completed_at
         FROM research_requests
         WHERE id = $1`,
        [researchRequestId]
    );

    return result.rows[0];
};
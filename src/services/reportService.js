import pool from '../config/database.js';

export const createReport = async (researchRequestId, content) => {
    const result = await pool.query(
        `INSERT INTO reports (research_request_id, content)
         VALUES ($1, $2)
         RETURNING id, research_request_id, content, created_at`,
        [researchRequestId, content]
    );

    return result.rows[0];
}
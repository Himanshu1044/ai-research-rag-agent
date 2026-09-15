import pool from '../config/database.js';

export const createResearchSource = async (
    researchRequestId,
    url,
    title,
    sourceIndex
) => {
    const result = await pool.query(
        `INSERT INTO research_sources
            (research_request_id, url, title, source_index, retrieved_at)
         VALUES
            ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING
            id,
            research_request_id,
            url,
            title,
            source_index,
            retrieved_at,
            created_at`,
        [
            researchRequestId,
            url,
            title,
            sourceIndex
        ]
    );

    return result.rows[0];
};
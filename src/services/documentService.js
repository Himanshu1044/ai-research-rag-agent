import pool from '../config/database.js'

export const createDocument = async (
    userId,
    title,
    source,
    content
) => {
    const result = await pool.query(
        `INSERT INTO documents
            (user_id, title, source, content)
         VALUES
            ($1, $2, $3, $4)
         RETURNING
            id,
            user_id,
            title,
            source,
            status,
            created_at,
            updated_at`,
        [
            userId,
            title,
            source,
            content
        ]
    );

    return result.rows[0];
}

export const getDocumentsByUser = async (userId) => {
    const result = await pool.query(
        `SELECT
            id,
            title,
            source,
            status,
            created_at
         FROM documents
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows;
}

export const getDocumentById = async (documentId, userId) => {
    const result = await pool.query(
        `SELECT
            id,
            title,
            source,
            content,
            status,
            created_at,
            updated_at
         FROM documents
         WHERE id = $1
         AND user_id = $2`,
        [documentId, userId]
    );

    return result.rows[0];
}

export const updateDocumentStatus = async (documentId, status) => {
    const result = await pool.query(
        `UPDATE documents
         SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING
            id,
            title,
            source,
            status,
            created_at,
            updated_at`,
        [status, documentId]
    );

    return result.rows[0];
}
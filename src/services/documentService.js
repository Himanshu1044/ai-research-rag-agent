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

export const getDocumentsByUser  = async (userId) => {

    const result = await pool.query(
        `SELECT id,title,source,status,created_at FROM documents 
        WHERE user_id = $1
        ORDER BY created_at DESC
        `, [userId]
    )
    return result.rows
}
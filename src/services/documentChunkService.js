import pool from '../config/database.js';

export const createDocumentChunks = async (
    documentId,
    chunks
) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const createdChunks = [];

        for (let i = 0; i < chunks.length; i++) {
            const result = await client.query(
                `INSERT INTO document_chunks
                    (document_id, chunk_index, content)
                 VALUES
                    ($1, $2, $3)
                 RETURNING
                    id,
                    document_id,
                    chunk_index,
                    content,
                    created_at`,
                [
                    documentId,
                    i,
                    chunks[i]
                ]
            );

            createdChunks.push(result.rows[0]);
        }

        await client.query('COMMIT');

        return createdChunks;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;

    } finally {
        client.release();
    }
};

export const updateChunkEmbedding = async (
    chunkId,
    embedding
) => {
    const result = await pool.query(
        `UPDATE document_chunks
         SET embedding = $1
         WHERE id = $2
         RETURNING
            id,
            document_id,
            chunk_index,
            content,
            embedding,
            created_at`,
        [
             JSON.stringify(embedding),
            chunkId
        ]
    );

    return result.rows[0];
};


import pool from '../config/database.js';

import { createQueryEmbedding } from './embeddingService.js';


export const retrieveKnowledge = async (
    userId,
    query,
    limit = 5
) => {

    const queryEmbedding = await createQueryEmbedding(query);

    const result = await pool.query(
        `SELECT
            dc.id,
            dc.document_id,
            dc.chunk_index,
            dc.content,
            d.title,
            d.source,
            dc.embedding <=> $1 AS distance
         FROM document_chunks dc
         JOIN documents d
             ON dc.document_id = d.id
         WHERE d.user_id = $2
         AND dc.embedding IS NOT NULL
         ORDER BY dc.embedding <=> $1
         LIMIT $3`,
        [
            JSON.stringify(queryEmbedding),
            userId,
            limit
        ]
    );

    return result.rows;
};

